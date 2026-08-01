"""Autopilot — pick rising names to buy, weak holdings to sell (capped, free AI).

Runs in a server background thread — browser can be closed.
"""

from __future__ import annotations

import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Callable

from oracle.config import get_settings
from oracle.core.types import Action, DecisionResult
from oracle.data.market import fetch_snapshot
from oracle.data.news import (
    NewsStore,
    poll_and_ingest,
    radar_status,
    research_digest,
    start_news_poller,
)
from oracle.execution.engine import ExecutionEngine, KillSwitch, estimate_day_pnl_pct
from oracle.execution.live_setup import (
    add_sleeve_realized,
    ai_budget,
    capital_plan,
    first_trade_notional,
    goal_progress,
    live_armed,
    live_max_notional,
    seed_capital,
    sleeve_equity,
    upsert_env,
)
from oracle.orchestration import OraclePipeline
from oracle.portfolio.activity_log import ActivityLog, format_clock, log_activity
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
from oracle.data.regime import build_regime
from oracle.portfolio.picker import (
    rank_decisions_for_trade,
    scalp_exit_from_holdings,
    screen_short_and_long,
    top_picks_summary,
)
from oracle.portfolio.stops import atr_stop_exits
from oracle.portfolio.store import load_portfolio

logger = logging.getLogger("oracle.autopilot")

_lock = threading.Lock()
_cycle_lock = threading.Lock()
_thread: threading.Thread | None = None
_stop = threading.Event()
_last: dict = {
    "ts": None,
    "message": "대기",
    "ok": True,
    "picks": [],
    "busy": False,
    "logs": [],
    "cycle": 0,
    "picks_ts": None,
    "stage": "stopped",  # analyzing | investing | preparing | watching | stopped
    "stage_ko": "정지",
    "situation": "아직 시작 전입니다.",
    "last_action": "",
    "prep_mode": False,
    "news": {},
    "watchlist": [],
}
_STATE_NAME = "autopilot_state.json"

ProgressFn = Callable[[str], None]


@dataclass
class AutopilotStatus:
    enabled: bool
    running: bool
    busy: bool
    interval_sec: int
    last_ts: str | None
    last_message: str
    last_ok: bool
    picks: list
    logs: list
    picks_ts: str | None = None
    cycle: int = 0
    stage: str = "stopped"
    stage_ko: str = "정지"
    situation: str = ""
    last_action: str = ""
    prep_mode: bool = False
    news: dict | None = None
    watchlist: list | None = None


def us_equity_session() -> dict:
    """Rough US cash-equity session (EDT/EST approx via UTC).

    buy_ok=False in first ~15m (open auction noise) and last ~30m (late chase).
    Stops/sells remain allowed whenever open=True.
    """
    now = datetime.now(UTC)
    # US Eastern ≈ UTC-4 (EDT) Mar–Nov; UTC-5 otherwise — use -4 for summer bias
    # Regular: Mon–Fri 13:30–20:00 UTC (EDT)
    weekday = now.weekday()  # 0=Mon
    minutes = now.hour * 60 + now.minute
    open_m, close_m = 13 * 60 + 30, 20 * 60
    if weekday >= 5:
        return {
            "open": False,
            "buy_ok": False,
            "minutes_since_open": None,
            "minutes_to_close": None,
            "label": "주말 · 미국 정규장 휴장",
            "hint": "장은 닫혀 있어도 분석은 계속하고, 주문은 브로커/페이퍼 규칙에 따릅니다.",
        }
    if open_m <= minutes < close_m:
        since = minutes - open_m
        to_close = close_m - minutes
        buy_ok = since >= 15 and to_close >= 30
        hint = "실시간 체결 가능한 시간대입니다."
        if not buy_ok:
            hint = (
                "개장 직후/마감 직전 · 신규 매수 제한(노이즈·추격 방지) · "
                "손절·익절 매도는 가능"
            )
        return {
            "open": True,
            "buy_ok": buy_ok,
            "minutes_since_open": since,
            "minutes_to_close": to_close,
            "label": "미국 정규장 개장중" + ("" if buy_ok else " · 매수창 외"),
            "hint": hint,
        }
    return {
        "open": False,
        "buy_ok": False,
        "minutes_since_open": None,
        "minutes_to_close": None,
        "label": "미국 정규장 휴장(장전/장후)",
        "hint": "분석은 계속 · 주문은 대기/제한될 수 있습니다.",
    }


def _set_stage(stage: str, situation: str | None = None) -> None:
    ko = {
        "analyzing": "분석중",
        "investing": "투자중",
        "preparing": "준비중",
        "watching": "대기중",
        "stopped": "정지",
    }.get(stage, stage)
    _last["stage"] = stage
    _last["stage_ko"] = ko
    if situation is not None:
        _last["situation"] = situation


def enabled() -> bool:
    return os.getenv("ORACLE_AUTOPILOT", "").strip().lower() in {"1", "true", "yes"}


def interval_sec() -> int:
    """Default 3 minutes — 24h continuous market watch (hunt mode shortens further)."""
    try:
        return max(60, int(os.getenv("ORACLE_AUTOPILOT_INTERVAL_SEC", "180")))
    except ValueError:
        return 180


def _state_path():
    from pathlib import Path

    return Path(get_settings().data_dir) / _STATE_NAME


def _persist_state() -> None:
    try:
        path = _state_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "ts": _last.get("ts"),
            "message": _last.get("message"),
            "ok": _last.get("ok", True),
            "picks": _last.get("picks") or [],
            "logs": list(_last.get("logs") or [])[-40:],
            "cycle": int(_last.get("cycle") or 0),
            "picks_ts": _last.get("picks_ts"),
            "stage": _last.get("stage"),
            "stage_ko": _last.get("stage_ko"),
            "situation": _last.get("situation"),
            "last_action": _last.get("last_action"),
            "prep_mode": bool(_last.get("prep_mode")),
            "news": _last.get("news") or {},
            "watchlist": list(_last.get("watchlist") or [])[:12],
            # never persist busy=true across restarts
            "busy": False,
        }
        path.write_text(__import__("json").dumps(payload, ensure_ascii=False), encoding="utf-8")
    except Exception:
        logger.debug("persist autopilot state failed", exc_info=True)


def _load_state() -> None:
    try:
        path = _state_path()
        if not path.exists():
            return
        import json

        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            _last.update(
                {
                    "ts": data.get("ts"),
                    "message": data.get("message") or _last.get("message"),
                    "ok": bool(data.get("ok", True)),
                    "picks": list(data.get("picks") or []),
                    "logs": list(data.get("logs") or [])[-40:],
                    "cycle": int(data.get("cycle") or 0),
                    "picks_ts": data.get("picks_ts"),
                    "stage": data.get("stage") or _last.get("stage"),
                    "stage_ko": data.get("stage_ko") or _last.get("stage_ko"),
                    "situation": data.get("situation") or _last.get("situation"),
                    "last_action": data.get("last_action") or _last.get("last_action"),
                    "prep_mode": bool(data.get("prep_mode")),
                    "news": data.get("news") or {},
                    "watchlist": list(data.get("watchlist") or [])[:12],
                    "busy": False,
                }
            )
    except Exception:
        logger.debug("load autopilot state failed", exc_info=True)


_load_state()


def status() -> AutopilotStatus:
    logs = []
    for line in list(_last.get("logs") or []):
        if isinstance(line, dict):
            ts = line.get("ts")
            text = line.get("text") or ""
            logs.append(
                {
                    "ts": ts,
                    "clock": line.get("clock") or format_clock(ts),
                    "text": text,
                }
            )
    stage = str(_last.get("stage") or ("analyzing" if _last.get("busy") else ("watching" if enabled() else "stopped")))
    if _last.get("busy") and stage not in {"analyzing", "investing", "preparing"}:
        stage = "preparing" if _last.get("prep_mode") else "analyzing"
    if not enabled() and not _last.get("busy"):
        stage = "stopped"
    ko = {
        "analyzing": "분석중",
        "investing": "투자중",
        "preparing": "준비중",
        "watching": "대기중",
        "stopped": "정지",
    }.get(stage, str(_last.get("stage_ko") or stage))
    return AutopilotStatus(
        enabled=enabled(),
        running=_thread is not None and _thread.is_alive(),
        busy=bool(_last.get("busy")),
        interval_sec=interval_sec(),
        last_ts=_last.get("ts"),
        last_message=str(_last.get("message") or ""),
        last_ok=bool(_last.get("ok", True)),
        picks=list(_last.get("picks") or []),
        logs=logs,
        picks_ts=_last.get("picks_ts"),
        cycle=int(_last.get("cycle") or 0),
        stage=stage,
        stage_ko=ko,
        situation=str(_last.get("situation") or ""),
        last_action=str(_last.get("last_action") or ""),
        prep_mode=bool(_last.get("prep_mode")),
        news=dict(_last.get("news") or radar_status()),
        watchlist=list(_last.get("watchlist") or []),
    )


def _push_log(msg: str, *, kind: str = "autopilot", persist_activity: bool = True) -> None:
    ts = datetime.now(UTC).isoformat()
    clock = format_clock(ts)
    logs = list(_last.get("logs") or [])
    # de-dupe identical consecutive lines
    if logs and logs[-1].get("text") == msg:
        logs[-1] = {"ts": ts, "clock": clock, "text": msg}
    else:
        logs.append({"ts": ts, "clock": clock, "text": msg})
    _last["logs"] = logs[-100:]
    _last["message"] = msg
    _last["ts"] = ts
    # Skip persisting heartbeat spam; keep in live panel only
    is_hb = "계속 계산 중" in msg or "스크리닝" in msg or msg.startswith("탐색 ")
    if persist_activity and not is_hb:
        try:
            log_activity(kind, msg)
        except Exception:
            logger.debug("activity log failed", exc_info=True)
    _persist_state()


def _set_last(msg: str, ok: bool = True, picks: list | None = None) -> None:
    _last["ts"] = datetime.now(UTC).isoformat()
    _last["message"] = msg
    _last["ok"] = ok
    if picks is not None:
        _last["picks"] = picks
        _last["picks_ts"] = _last["ts"]
    _push_log(msg)
    _persist_state()


def _recently_sold(symbol: str, *, hours: float = 6.0) -> bool:
    """L6 anti-whipsaw: avoid re-buying a name sold very recently."""
    try:
        from datetime import timedelta

        cutoff = datetime.now(UTC) - timedelta(hours=hours)
        for row in TradeJournal().list_recent(limit=40):
            if str(row.get("symbol") or "").upper() != symbol.upper():
                continue
            if str(row.get("action") or "") not in {"Sell", "Reduce"}:
                continue
            if str(row.get("status") or "") not in {"filled", "submitted"}:
                continue
            ts = str(row.get("ts") or "")
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=UTC)
                if dt >= cutoff:
                    return True
            except Exception:
                continue
    except Exception:
        return False
    return False


def _execute_decision(d: DecisionResult, *, max_n: float) -> dict:
    from oracle.data.earnings import earnings_blackout
    from oracle.portfolio.sizing import vol_target_weight

    engine = ExecutionEngine(require_confirm=False)
    price = float(fetch_snapshot(d.symbol).price)
    portfolio = load_portfolio(get_settings().portfolio_path)
    avg_cost = 0.0
    sess = us_equity_session()

    if d.action in (Action.BUY, Action.ADD):
        if max_n <= 0.5:
            return {"ok": False, "message": f"{d.symbol} AI 한도 소진 · 매수 스킵"}
        if sess.get("open") and not sess.get("buy_ok", True):
            return {
                "ok": False,
                "message": f"{d.symbol} 매수창 외(개장직후/마감직전) · 신규매수 스킵",
            }
        if _recently_sold(d.symbol):
            return {
                "ok": False,
                "message": f"{d.symbol} 최근 매도 후 재매수 쿨다운 (휩쏘 방지)",
            }
        blocked, why = earnings_blackout(d.symbol, days=1)
        if blocked:
            return {"ok": False, "message": f"{d.symbol} {why} · 매수 스킵"}
        # Vol-target $ size ∩ hard notional cap (high-vol names get smaller tickets)
        equity = max(float(portfolio.equity()), 1.0)
        vt_dollar = vol_target_weight(d.symbol, target_vol=0.10) * equity
        ticket = min(float(max_n), max(vt_dollar, 1.0))
        # Never exceed remaining cash
        ticket = min(ticket, max(float(portfolio.cash), 0.0))
        shares = ticket / price if price else 0.0
        if shares * price < 1.0:
            return {"ok": False, "message": f"{d.symbol} 주문금액 과소 · 스킵"}
        action = d.action.value
    elif d.action in (Action.REDUCE, Action.SELL):
        held = 0.0
        for p in portfolio.positions:
            if p.symbol == d.symbol:
                held = float(p.shares)
                avg_cost = float(p.avg_cost or 0)
                break
        if held <= 0:
            return {"ok": False, "message": f"{d.symbol} 매도 신호·보유없음"}
        qty = min(held, max_n / price if price else held)
        if d.action == Action.REDUCE:
            qty = min(held * 0.5, qty)
        shares = -qty
        action = d.action.value
    else:
        return {"ok": False, "message": f"스킵 {d.action.value}"}

    # Live: only when LIVE is armed. No separate approval queue — AI executes within notional caps.
    live = live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", "paper")
    if live:
        # Ensure flag stays on while armed so background loop can trade real money
        if os.getenv("ORACLE_AUTOPILOT_LIVE", "").strip() not in {"1", "true", "yes"}:
            upsert_env({"ORACLE_AUTOPILOT_LIVE": "1"})

    jid = TradeJournal().add(
        JournalEntry(
            ts=now_iso(),
            symbol=d.symbol,
            action=action,
            shares=shares,
            price=price,
            rationale=(
                f"SMART PICK · {action} · conf={d.confidence:.2f} score={d.composite_score:+.2f} · "
                f"{d.rationale[:160]}"
            ),
            status="planned",
            client_order_id=f"pick-{uuid.uuid4().hex[:10]}",
        )
    )
    # Avoid stacking weekend/open orders
    broker = engine.broker
    if broker is not None and hasattr(broker, "has_open_order") and broker.has_open_order(d.symbol):
        return {
            "ok": True,
            "message": f"{d.symbol} 미체결 주문 있음 · 중복 스킵",
            "journal_id": jid,
            "queued": True,
        }

    out = engine.confirm_journal_entry(jid)
    kind = "체결" if ("filled" in (out.message or "").lower() or "Broker filled" in (out.message or "")) else (
        "접수" if out.accepted else "실패"
    )
    # Sleeve realized PnL on sells (seed mission accounting)
    if out.accepted and shares < 0 and avg_cost > 0:
        try:
            add_sleeve_realized(abs(shares) * (price - avg_cost))
        except Exception:
            logger.debug("sleeve realized update failed", exc_info=True)
    msg = f"{kind} {d.symbol} {action} ${abs(shares * price):.2f} · {out.message}"
    try:
        log_activity(
            "trade",
            msg,
            detail=(d.rationale or "")[:240],
            symbol=d.symbol,
            meta={"action": action, "shares": shares, "price": price, "journal_id": jid},
        )
    except Exception:
        pass
    return {
        "ok": out.accepted,
        "message": msg,
        "journal_id": jid,
    }


def run_once(on_progress: ProgressFn | None = None) -> dict:
    """Screen → AI decide → buy strongest / sell weakest (max 2 fills)."""
    if not enabled():
        return {"ok": False, "message": "자율매매 OFF"}

    if not _cycle_lock.acquire(blocking=False):
        msg = "이미 자율매매 사이클 진행 중 · 브라우저 꺼도 서버에서 계속됩니다"
        if on_progress:
            on_progress(msg)
        return {"ok": False, "message": msg, "busy": True}

    def prog(msg: str) -> None:
        _push_log(msg)
        if on_progress:
            try:
                on_progress(msg)
            except Exception:
                logger.debug("progress callback failed", exc_info=True)

    _last["busy"] = True
    _set_stage("analyzing", "사이클 시작 · 시장 분석 준비")
    try:
        return _run_once_locked(prog)
    finally:
        _last["busy"] = False
        if enabled():
            sess = us_equity_session()
            if not sess.get("open"):
                _set_stage(
                    "preparing",
                    f"휴장 준비 대기 · {sess['label']} · "
                    f"{_last.get('last_action') or '워치리스트·뉴스 유지'} · "
                    "레이더는 계속 수집",
                )
            else:
                _set_stage(
                    "watching",
                    f"다음 사이클 대기 · {sess['label']} · {_last.get('last_action') or '직전 결과 유지'}",
                )
        else:
            _set_stage("stopped", "사용자가 멈춤")
        _cycle_lock.release()


def _run_once_locked(prog: ProgressFn) -> dict:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    if ks.active:
        msg = f"긴급정지로 스킵 · {ks.reason}"
        _set_last(msg, ok=False)
        _set_stage("watching", msg)
        prog(msg)
        return {"ok": False, "message": msg}

    equity = float(portfolio.equity())
    sleeve = sleeve_equity(portfolio)
    plan = capital_plan(portfolio, cash=float(portfolio.cash))
    gprog = goal_progress(equity, sleeve=sleeve)
    session = us_equity_session()
    prep_mode = not bool(session.get("open"))
    _last["prep_mode"] = prep_mode
    cycle = int(_last.get("cycle") or 0) + 1
    _last["cycle"] = cycle
    urgency = float(gprog.get("urgency") or 0.0)
    mode = str(gprog.get("mode") or "hunt")
    stage0 = "preparing" if prep_mode else "analyzing"
    _set_stage(
        stage0,
        (
            f"사이클 #{cycle} {'장 휴장 준비중' if prep_mode else '분석중'} · "
            f"모드 {gprog.get('mode_ko') or mode} · {session['label']}"
        ),
    )
    prog(f"장 상태 · {session['label']} · {session['hint']}")
    if prep_mode:
        prog("준비 모드 · 주문 보류 · 광역·심층 분석으로 개장 워치리스트만 갱신")
    else:
        prog("개장 모드 · 광역 스캔 + 심층 두뇌 후 한도 내 집행")

    # ⓪ News: radar thread already sweeps the universe; cycle only refreshes
    # holdings/macro lightly (avoids double Yahoo hammering) then drains fresh queue.
    held_early = list(portfolio.held_symbols())
    light_news = list(dict.fromkeys([*held_early, "SPY", "QQQ"]))[:12]
    prog(f"⓪ 뉴스 큐 소모 · 보유/매크로 보강 {len(light_news)}종목")
    try:
        news_result = poll_and_ingest(
            light_news,
            per_symbol=6,
            include_macro=True,
        )
    except Exception as exc:
        logger.exception("news ingest failed")
        news_result = {"fetched": 0, "new": 0, "material": 0, "fresh": [], "material_fresh": []}
        prog(f"뉴스 보강 실패 · {exc} · 레이더 큐로 계속")
    fresh_rows = NewsStore().take_fresh(limit=16, min_material=0.12)
    material_n = int(news_result.get("material") or 0)
    new_n = int(news_result.get("new") or 0)
    radar = radar_status()
    _last["news"] = {
        **radar,
        "cycle_new": new_n,
        "cycle_material": material_n,
        "fresh_titles": [r.get("title") for r in fresh_rows[:6]],
    }
    prog(
        f"뉴스 · 사이클신규 {new_n} · 중요 {material_n} · "
        f"분석큐 {len(fresh_rows)} · 레이더누적 {radar.get('total', 0)}"
    )
    news_priority = []
    for row in fresh_rows:
        sym = (row.get("symbol") or "").upper()
        if sym and sym not in {"MACRO", "SPY", "QQQ", "IWM", "^VIX"}:
            news_priority.append(sym)
        title = (row.get("title") or "")[:90]
        if title:
            prog(f"속보 · [{sym or 'MACRO'}] {title}")
    news_priority = list(dict.fromkeys(news_priority))[:8]
    if fresh_rows:
        try:
            ActivityLog().add(
                "news",
                f"신규·중요 뉴스 {len(fresh_rows)}건 분석 큐",
                detail=" · ".join((r.get("title") or "")[:60] for r in fresh_rows[:4]),
                meta={"fresh": fresh_rows[:8], "cycle": cycle},
            )
        except Exception:
            pass

    # Always deep on autopilot — shallow "fast" path missed edges and caused empty holds.
    deep = True

    if plan.get("set"):
        prog(
            f"AI한도 ${plan['budget']:,.0f} · 사용중 ${plan['open_cost']:,.0f} · "
            f"남음 ${plan['remaining_budget']:,.0f} · 슬리브 ${plan['sleeve']:,.2f}"
        )
        prog(f"모드 {gprog.get('mode_ko') or mode} · urgency={urgency:.2f}")
        if mode in {"hunt", "panic"} or urgency >= 0.55:
            prog(
                f"사냥 압박 ON · multiple={gprog.get('multiple')} · "
                "극단 단타로 빠르게 불립니다 (잃기만 하면 AI 영원 소멸)"
            )
        elif mode == "lock":
            prog("잠금 모드 · 목표 근접 · 넓게 보되 주문만 작게")
    else:
        prog("AI 한도·목표·기간 미설정 · 자산/AI자동에서 저장하세요")

    if gprog["set"]:
        stake = float(gprog.get("stake") or equity)
        prog(
            f"목표 ${gprog['goal']:,.0f} · 미션자산 ${stake:,.2f} · "
            f"{gprog['pct']*100:.0f}% · {gprog['label']}"
        )
        if gprog.get("threat_ko"):
            prog(gprog["threat_ko"])
        if gprog["reached"] or mode == "won":
            prog(f"목표 달성 · ${stake:,.2f} ≥ ${gprog['goal']:,.0f} · 매수 중단 · 약한 종목만 정리")

    # Always wide screen — narrowing in lock only hid exits/edges; size gates risk instead.
    lim_short, lim_long = 14, 8
    prog(f"① 광역 탐색 · 사이클 #{cycle} · 심층지능 ON · 단타{lim_short}/장타{lim_long}")
    short_picks, long_picks, blend_picks = screen_short_and_long(
        limit_short=lim_short,
        limit_long=lim_long,
        on_progress=prog,
    )
    picks_view = top_picks_summary(limit=12)
    _last["picks"] = picks_view
    _last["picks_ts"] = datetime.now(UTC).isoformat()
    try:
        ActivityLog().add(
            "screen",
            f"탐색 완료 · 단타 {len(short_picks)} · 장타 {len(long_picks)}"
            + (" · 준비모드" if prep_mode else " · 개장광역"),
            detail=" · ".join(
                f"{p.get('symbol')}({p.get('horizon')})" for p in picks_view[:6]
            ),
            meta={"picks": picks_view[:8], "cycle": cycle, "prep": prep_mode},
        )
    except Exception:
        pass

    if short_picks:
        prog(
            "단타(눌림매수) TOP "
            + " · ".join(f"{p.symbol}(dip {p.dip_score:.2f})" for p in short_picks[:4])
        )
    if long_picks:
        prog(
            "장타 TOP "
            + " · ".join(f"{p.symbol}({p.long_score:+.2f})" for p in long_picks[:4])
        )
    rip_exits = scalp_exit_from_holdings(set(portfolio.held_symbols()))
    if rip_exits:
        prog(
            "단타(익절매도) "
            + " · ".join(f"{p.symbol}(rip {p.rip_score:.2f})" for p in rip_exits[:3])
        )

    held = list(portfolio.held_symbols())
    top_n = 6
    top_syms = list(
        dict.fromkeys(
            news_priority
            + [p.symbol for p in short_picks[:top_n]]
            + [p.symbol for p in long_picks[:top_n]]
            + [p.symbol for p in blend_picks[:4]]
        )
    )
    symbols = list(dict.fromkeys([*held, *top_syms]))[:16]

    pipe_session = "weekend_prep" if prep_mode and datetime.now(UTC).weekday() >= 5 else (
        "closed_prep" if prep_mode else "autopilot"
    )
    prog(
        f"② 심층 AI · 후보 {len(symbols)}종목 · {', '.join(symbols)} · 3패스 두뇌"
        + (f" · {pipe_session}" if prep_mode else "")
    )
    if fresh_rows:
        prog(f"뉴스 FACT · {research_digest(limit=6)[:280]}")
    result = OraclePipeline(settings).run(
        session=pipe_session,
        symbols=symbols,
        on_progress=prog,
        fast_llm=False,
        deep_llm=True,
    )
    regime = build_regime()
    prog(
        f"레짐 FACT · {regime.get('label')} · VIX레벨 {regime.get('vix_level')} · "
        f"SPY일 {regime.get('spy_day'):+.2f}% · QQQ일 {regime.get('qqq_day'):+.2f}%"
    )

    # ATR / hard% stops beat AI Hold — cut losers with price facts
    stop_exits = atr_stop_exits(portfolio)
    if stop_exits:
        prog(
            "ATR/하드 손절 발동 · "
            + " · ".join(f"{d.symbol}:{d.action.value}" for d in stop_exits[:4])
        )

    huntish = mode in {"hunt", "panic"} or urgency >= 0.55
    best_buy, best_sell = rank_decisions_for_trade(
        result.decisions,
        held=set(held),
        aggressive=huntish and not regime.get("risk_off"),
    )
    prog(
        f"AI 후보 정리 · 매수={'있음 '+best_buy.symbol if best_buy else '없음'} · "
        f"매도={'있음 '+best_sell.symbol if best_sell else '없음'}"
        + (" · 사냥(공격 기준)" if huntish else "")
    )

    # Stops override weak AI holds on the same name
    if stop_exits:
        best_sell = stop_exits[0]
        prog(f"손절 우선 · {best_sell.symbol} · {best_sell.rationale[:120]}")

    # 단타 익절: 보유가 급등(rip)하면 AI Hold여도 매도 후보로 승격 (stops already set)
    if not stop_exits and rip_exits and (
        best_sell is None
        or (rip_exits[0].rip_score >= 0.05 and best_sell.symbol != rip_exits[0].symbol)
    ):
        from oracle.core.types import DecisionResult as DR
        from oracle.core.types import RiskVeto

        top_rip = rip_exits[0]
        best_sell = DR(
            symbol=top_rip.symbol,
            action=Action.SELL if top_rip.rip_score >= 0.07 else Action.REDUCE,
            confidence=0.58,
            composite_score=-min(0.7, top_rip.rip_score * 2),
            rationale=f"단타 익절 · sell-the-rip · {', '.join(top_rip.reasons)}",
            agent_opinions=[],
            risk_veto=RiskVeto(active=False, reason="scalp_exit", confidence=0.55),
        )
        prog(f"단타 익절 승격 · {top_rip.symbol} rip={top_rip.rip_score:.2f}")

    # Ticket size: hard broker caps ∩ AI remaining budget (user-assigned sleeve)
    remain = float(plan.get("remaining_budget") if plan.get("remaining_budget") is not None else live_max_notional())
    hard = min(live_max_notional(), max(remain, 0.0), float(portfolio.cash))
    # Per-order sizing by phase: hunt concentrates firepower; lock stays small
    if mode in {"hunt", "panic"} or urgency >= 0.55:
        budget_slice = max(1.0, remain * (0.55 if urgency >= 0.75 or mode == "panic" else 0.42))
    elif mode == "lock":
        budget_slice = max(1.0, remain * 0.12)
    else:
        budget_slice = max(1.0, remain * 0.28)
    max_n = min(hard, max(first_trade_notional(), budget_slice), first_trade_notional() * 2.5)
    if regime.get("risk_off"):
        max_n = min(max_n, first_trade_notional() * 0.55)
        prog("리스크오프(VIX/지수 FACT) · 주문 한도 축소 · 스크린 폴백 매수 금지")
        if best_buy and float(getattr(best_buy, "confidence", 0) or 0) < 0.62:
            prog(f"매수 {best_buy.symbol} 보류 · risk_off에서 고확신만")
            best_buy = None
    if ai_budget() is not None:
        max_n = min(max_n, hard)
        prog(f"주문 한도 ${max_n:,.2f} (AI 잔여한도 ${remain:,.2f})")

    near_goal = bool(gprog["set"] and (gprog["pct"] >= 0.7 or mode == "lock"))
    reached = bool(gprog.get("reached") or mode == "won")
    far_from_goal = bool(gprog["set"] and gprog["pct"] < 0.5 and mode == "hunt")
    if remain <= 0.5 and not (best_sell):
        prog("AI 사용 한도 소진 · 매수 중단 · 보유 정리/익절만 검토")
        best_buy = None
    if reached:
        max_n = min(max_n, first_trade_notional() * 0.5)
        prog("목표 달성 · 신규 매수 금지 · 약한 종목 정리만")
        best_buy = None
    elif mode == "lock" or near_goal:
        max_n = min(max_n, first_trade_notional() * 0.75)
        prog("잠금/근접 · 공격 매수 축소 · 이익 보호 우선")
        # Lock: shrink tickets above; don't zero-out decent buys (0.72 was empty-hold trap)
        if best_buy and float(getattr(best_buy, "confidence", 0) or 0) < 0.48:
            prog(f"매수 후보 {best_buy.symbol} 보류 · 잠금 모드 확신 부족")
            best_buy = None
    elif mode in {"hunt", "panic"} or urgency >= 0.55:
        # Do NOT size up just because sleeve is losing — that was revenge-trade anti-edge
        mult = 1.5 if mode == "panic" else 1.35
        max_n = min(hard, first_trade_notional() * mult, max(remain * 0.4, 1.0))
        prog(f"사냥 모드 urgency={urgency:.2f} · 한도 내 집행(손실복구 오버사이즈 금지)")
    elif far_from_goal:
        max_n = min(hard, first_trade_notional() * 1.35, max(remain * 0.35, 1.0))
        prog("목표까지 멀음 · 단타 눌림 집중")

    if session.get("open") and not session.get("buy_ok", True) and best_buy:
        prog(f"매수창 외 · {best_buy.symbol} 신규매수 보류 (손절/익절만)")
        best_buy = None

    msgs: list[str] = []
    executed = 0
    skip_reasons: list[str] = []

    # Build open-ready watchlist (always; critical when prep_mode)
    watchlist: list[dict] = []
    if best_buy:
        watchlist.append(
            {
                "symbol": best_buy.symbol,
                "side": "BUY",
                "confidence": float(best_buy.confidence or 0),
                "rationale": (best_buy.rationale or "")[:160],
            }
        )
    if best_sell:
        watchlist.append(
            {
                "symbol": best_sell.symbol,
                "side": best_sell.action.value,
                "confidence": float(best_sell.confidence or 0),
                "rationale": (best_sell.rationale or "")[:160],
            }
        )
    for p in (short_picks[:3] + long_picks[:2]):
        if any(w["symbol"] == p.symbol for w in watchlist):
            continue
        watchlist.append(
            {
                "symbol": p.symbol,
                "side": "WATCH",
                "confidence": float(getattr(p, "short_score", 0) or getattr(p, "long_score", 0) or 0),
                "rationale": ", ".join((p.reasons or [])[:3])[:160],
            }
        )
    _last["watchlist"] = watchlist[:10]

    prog("③ 매수·매도 후보 선택 (단타=싸게사고비싸게팔기)")
    if best_sell:
        prog(f"매도 후보 {best_sell.symbol} · {best_sell.action.value} · conf={best_sell.confidence:.2f}")
    if best_buy and not reached and mode != "won":
        prog(f"매수 후보 {best_buy.symbol} · {best_buy.action.value} · conf={best_buy.confidence:.2f}")
    elif best_buy:
        prog(f"매수 후보 {best_buy.symbol} 보류 · 목표 달성")
        skip_reasons.append("목표 달성으로 신규 매수 보류")
        best_buy = None
    if not best_buy and not best_sell:
        skip_reasons.append("AI가 고확신 매수/매도 후보를 못 뽑음")

    # Closed market / weekend: research only — no new orders until cash session opens
    if prep_mode:
        ready = " · ".join(
            f"{w['side']} {w['symbol']}" for w in watchlist[:5]
        ) or "워치리스트 갱신 중"
        digest = research_digest(limit=4)
        msg = (
            f"장 휴장 준비 완료 · 개장 대기 주문 없음 · "
            f"준비 {ready} · 뉴스 {new_n}/{material_n}"
        )
        prog(f"④ 주문 보류 · {session['label']} · 개장 시 바로 집행할 계획 저장")
        prog(f"워치리스트 · {ready}")
        if digest:
            prog(f"뉴스 브리핑 · {digest[:220]}")
        _last["last_action"] = msg
        _set_stage("preparing", f"준비중 · {msg}")
        _set_last(msg, picks=picks_view)
        try:
            ActivityLog().add(
                "prep",
                "휴장 준비 사이클 완료",
                detail=msg,
                meta={"watchlist": watchlist[:8], "cycle": cycle, "news": _last.get("news")},
            )
        except Exception:
            pass
        return {
            "ok": True,
            "message": msg,
            "run_id": result.run_id,
            "picks": picks_view,
            "prep": True,
            "watchlist": watchlist,
        }

    for label, dec in (("SELL", best_sell), ("BUY", best_buy)):
        if dec is None:
            continue
        _set_stage(
            "investing",
            f"투자중 · {label} {dec.symbol} 주문 실행 · 한도 ${max_n:,.2f}",
        )
        prog(f"④ 실제 주문 실행 · {label} {dec.symbol}")
        out = _execute_decision(dec, max_n=max_n)
        msgs.append(f"[{label}] {out['message']}")
        prog(out["message"])
        if out.get("ok"):
            executed += 1
            _last["last_action"] = f"{label} {dec.symbol} 성공"
        else:
            skip_reasons.append(f"{label} {dec.symbol} 실패/스킵 · {out.get('message')}")
        if executed >= 2:
            break

    # Screen fallback: only hunt, never risk_off / buy_window_closed / illiquid / weak dip
    if (
        not msgs
        and mode in {"hunt", "panic"}
        and not reached
        and remain > 0.5
        and not regime.get("risk_off")
        and session.get("buy_ok", True)
    ):
        from oracle.core.types import DecisionResult as DR
        from oracle.core.types import RiskVeto
        from oracle.agents.risk_manager import RiskManagerAgent
        from oracle.data.earnings import earnings_blackout

        _set_stage("investing", "투자중 · 스크린 폴백(사실필터 통과분만)")
        prog("사냥 폴백 · ADV$/RVOL/눌림 기준 통과 종목만")
        max_fills = 2
        for tag, bucket, thresh in (
            ("단타", short_picks, 0.028),  # was 0.008 — revenge-trade anti-edge
            ("장타", long_picks, 0.045),
        ):
            if executed >= max_fills:
                break
            if not bucket:
                skip_reasons.append(f"{tag} 스크린 후보 없음")
                continue
            top = bucket[0]
            score = top.dip_score if tag == "단타" else top.long_score
            if score < thresh:
                skip_reasons.append(f"{tag} 상위 {top.symbol} 점수 {score:.3f} < {thresh}")
                continue
            if not getattr(top, "tradeable", True):
                skip_reasons.append(f"{top.symbol} {getattr(top, 'skip_reason', '비거래')}")
                continue
            if float(getattr(top, "rvol", 1.0) or 0) < 0.9 and tag == "단타":
                skip_reasons.append(f"{top.symbol} RVOL {top.rvol:.2f}<0.9")
                continue
            blocked, why = earnings_blackout(top.symbol, days=1)
            if blocked:
                skip_reasons.append(why)
                continue
            fake = DR(
                symbol=top.symbol,
                action=Action.BUY,
                confidence=0.55,
                composite_score=min(0.65, max(score * 2, 0.2)),
                rationale=f"SCREEN {tag} · {', '.join(top.reasons)}",
                agent_opinions=[],
                risk_veto=RiskVeto(active=False, reason="screen", confidence=0.5),
            )
            veto = RiskManagerAgent().veto(top.symbol, portfolio)
            if veto.active:
                prog(f"[SCREEN {tag}] {top.symbol} 리스크거부로 스킵")
                skip_reasons.append(f"{top.symbol} 리스크거부")
                continue
            prog(
                f"스크린 폴백 · {tag} 매수 {top.symbol} "
                f"(score={score:.3f} rvol={getattr(top,'rvol',0):.2f})"
            )
            out = _execute_decision(fake, max_n=max_n)
            msgs.append(f"[SCREEN {tag}] {out['message']}")
            prog(out["message"])
            if out.get("ok"):
                executed += 1
                _last["last_action"] = f"SCREEN {tag} {top.symbol}"
            else:
                skip_reasons.append(out.get("message") or f"{top.symbol} 주문 실패")

    if not msgs:
        why = " · ".join(skip_reasons[:4]) if skip_reasons else "강한 매수/매도 엣지 없음"
        msg = f"관망 · {why}"
        if mode == "lock" or near_goal:
            msg = f"잠금/근접 관망 · 이익 보호 · {why}"
        elif mode == "won" or reached:
            msg = "목표 달성 · 안정 수호 중 (신규 매수 없음)"
        if not session.get("open"):
            msg += f" · {session['label']}"
        _last["last_action"] = msg
        _set_stage("watching", f"대기중 · {msg}")
        _set_last(msg, picks=picks_view)
        return {"ok": True, "message": msg, "run_id": result.run_id, "picks": picks_view}

    msg = " · ".join(msgs)
    _last["last_action"] = msg
    _set_stage("investing" if executed else "watching", f"투자 결과 · {msg}")
    _set_last(msg, ok=executed > 0, picks=picks_view)
    return {
        "ok": executed > 0,
        "message": msg,
        "run_id": result.run_id,
        "picks": picks_view,
        "executed": executed,
    }


def _wait_sec_for_pressure() -> int:
    """Hunt faster; lock slower; closed-market prep keeps researching (not idle)."""
    base = interval_sec()
    try:
        sess = us_equity_session()
        portfolio = load_portfolio(get_settings().portfolio_path)
        g = goal_progress(float(portfolio.equity()), sleeve=sleeve_equity(portfolio))
        u = float(g.get("urgency") or 0.0)
        mode = str(g.get("mode") or "")
        # Fresh material news → wake up sooner even between cycles
        try:
            pending = int((radar_status() or {}).get("material_pending") or 0)
        except Exception:
            pending = 0
        if pending >= 3:
            return max(45, base // 3)
        if not sess.get("open"):
            # Weekend / after-hours: keep deep prep rolling, slightly calmer than hunt panic
            if mode == "won":
                return max(base, int(base * 1.5))
            return max(90, int(base * 0.85))
        if mode == "won":
            return max(base, base * 2)
        if mode == "lock":
            return max(base, int(base * 1.25))
        if g.get("deadline_passed") or mode == "panic" or u >= 0.85 or g.get("losing"):
            return max(60, base // 4)
        if mode == "hunt" or u >= 0.55:
            return max(75, base // 2)
    except Exception:
        pass
    return base


def _on_radar_fresh(fresh: list) -> None:
    """Callback from news poller — surface ASAP without waiting for next trade tick."""
    if not fresh:
        return
    titles = []
    for h in fresh[:4]:
        sym = getattr(h, "symbol", None) or "?"
        titles.append(f"[{sym}] {(getattr(h, 'title', '') or '')[:70]}")
    line = "속보 레이더 · " + " · ".join(titles)
    try:
        _push_log(line, kind="news")
        _last["news"] = radar_status()
        if not _last.get("busy"):
            _set_stage(
                "preparing" if not us_equity_session().get("open") else "analyzing",
                f"신규 뉴스 {len(fresh)}건 수신 · 다음 사이클에서 즉시 심층 분석",
            )
    except Exception:
        logger.debug("radar fresh log failed", exc_info=True)


def _loop() -> None:
    logger.info("Autopilot loop start interval=%ss (browser-independent)", interval_sec())
    _push_log(
        f"서버 자율루프 시작 · {interval_sec()}초마다 "
        f"(뉴스 레이더 병행 · 휴장은 준비모드 · 창 꺼도 계속)"
    )
    time.sleep(3)
    while not _stop.is_set():
        if enabled():
            try:
                run_once()
            except Exception as exc:
                logger.exception("autopilot cycle failed")
                _set_last(f"오류 · {exc}", ok=False)
        wait = _wait_sec_for_pressure() if enabled() else interval_sec()
        _stop.wait(wait)
    logger.info("Autopilot loop stopped")


def start_background() -> None:
    global _thread
    with _lock:
        if _thread and _thread.is_alive():
            start_news_poller(interval_sec=45, on_fresh=_on_radar_fresh)
            return
        _stop.clear()
        _load_state()
        _thread = threading.Thread(target=_loop, daemon=True, name="oracle-autopilot")
        _thread.start()
        start_news_poller(interval_sec=45, on_fresh=_on_radar_fresh)
        logger.info("Autopilot + news radar launched (survives browser close)")


def set_enabled(on: bool, *, allow_live: bool = False) -> None:
    updates = {"ORACLE_AUTOPILOT": "1" if on else "0"}
    if allow_live:
        updates["ORACLE_AUTOPILOT_LIVE"] = "1"
    elif not on:
        updates["ORACLE_AUTOPILOT_LIVE"] = "0"
    upsert_env(updates)
    if on:
        start_background()
        sess = us_equity_session()
        if sess.get("open"):
            _set_stage("watching", "24시간 ON · 뉴스 레이더+분석 사이클 시작")
            _set_last("24시간 ON · 뉴스·분석·매매 계속 (창 꺼도 유지)")
        else:
            _set_stage("preparing", f"24시간 ON · {sess['label']} · 개장까지 준비·뉴스 분석")
            _set_last(f"24시간 ON · 휴장 준비모드 · {sess['label']}")
        _push_log("24시간 자율투자/준비 시작 · 뉴스 레이더 상시 · 멈추기 전까지 반복")
    else:
        _set_stage("stopped", "정지 · 다시 시작을 눌러야 재개")
        _set_last("정지됨 · 다시 시작 버튼을 눌러야 재개")
        _push_log("사용자가 멈춤 · 24시간 루프 대기")
