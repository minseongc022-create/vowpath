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
from oracle.execution.engine import ExecutionEngine, KillSwitch, estimate_day_pnl_pct
from oracle.execution.live_setup import (
    first_trade_notional,
    goal_progress,
    live_armed,
    live_max_notional,
    upsert_env,
)
from oracle.orchestration import OraclePipeline
from oracle.portfolio.activity_log import ActivityLog, format_clock, log_activity
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
from oracle.portfolio.picker import (
    rank_decisions_for_trade,
    scalp_exit_from_holdings,
    screen_short_and_long,
    screen_universe,
    top_picks_summary,
)
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


def enabled() -> bool:
    return os.getenv("ORACLE_AUTOPILOT", "").strip().lower() in {"1", "true", "yes"}


def interval_sec() -> int:
    try:
        return max(60, int(os.getenv("ORACLE_AUTOPILOT_INTERVAL_SEC", "300")))
    except ValueError:
        return 300


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
    _last["logs"] = logs[-48:]
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


def _execute_decision(d: DecisionResult, *, max_n: float) -> dict:
    engine = ExecutionEngine(require_confirm=False)
    price = float(fetch_snapshot(d.symbol).price)
    portfolio = load_portfolio(get_settings().portfolio_path)

    if d.action in (Action.BUY, Action.ADD):
        shares = max_n / price if price else 0.0
        action = d.action.value
    elif d.action in (Action.REDUCE, Action.SELL):
        held = 0.0
        for p in portfolio.positions:
            if p.symbol == d.symbol:
                held = float(p.shares)
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
    try:
        return _run_once_locked(prog)
    finally:
        _last["busy"] = False
        _cycle_lock.release()


def _run_once_locked(prog: ProgressFn) -> dict:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    if ks.active:
        msg = f"긴급정지로 스킵 · {ks.reason}"
        _set_last(msg, ok=False)
        prog(msg)
        return {"ok": False, "message": msg}

    equity = float(portfolio.equity())
    gprog = goal_progress(equity)
    cycle = int(_last.get("cycle") or 0) + 1
    _last["cycle"] = cycle
    urgency = float(gprog.get("urgency") or 0.0)
    # Deep brain every 3rd cycle, or when survival pressure is high
    deep = (cycle % 3 == 0) or urgency >= 0.55 or bool(gprog.get("deadline_passed"))

    if gprog["set"]:
        prog(
            f"목표 ${gprog['goal']:,.0f} · 현재 ${equity:,.2f} · "
            f"{gprog['pct']*100:.0f}% · {gprog['label']}"
        )
        if gprog.get("threat_ko"):
            prog(gprog["threat_ko"])
        if gprog["reached"]:
            prog(f"목표 달성 · ${equity:,.2f} ≥ ${gprog['goal']:,.0f} · 매수만 멈추고 약한 종목은 정리")

    prog(f"① 탐색 시작 · 사이클 #{cycle}" + (" · 심층지능 ON" if deep else " · 빠른 모드"))
    short_picks, long_picks, blend_picks = screen_short_and_long(
        limit_short=6,
        limit_long=6,
        on_progress=prog,
    )
    picks_view = top_picks_summary(limit=8)
    _last["picks"] = picks_view
    _last["picks_ts"] = datetime.now(UTC).isoformat()
    screened = blend_picks or screen_universe(limit=8)
    try:
        ActivityLog().add(
            "screen",
            f"탐색 완료 · 단타 {len(short_picks)} · 장타 {len(long_picks)}",
            detail=" · ".join(
                f"{p.get('symbol')}({p.get('horizon')})" for p in picks_view[:6]
            ),
            meta={"picks": picks_view[:8], "cycle": cycle},
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
    # Deep AI on holdings + best short + best long (breadth without analyzing 100 names in LLM)
    top_syms = list(
        dict.fromkeys(
            [p.symbol for p in short_picks[:4]]
            + [p.symbol for p in long_picks[:4]]
            + [p.symbol for p in blend_picks[:3]]
        )
    )
    symbols = list(dict.fromkeys([*held, *top_syms]))[:10]

    prog(
        f"② 심층 AI · 단타+장타 후보 {len(symbols)}종목 · {', '.join(symbols)}"
        + (" · 3패스 두뇌" if deep else "")
    )
    result = OraclePipeline(settings).run(
        session="autopilot",
        symbols=symbols,
        on_progress=prog,
        fast_llm=not deep,
        deep_llm=deep,
    )
    best_buy, best_sell = rank_decisions_for_trade(result.decisions, held=set(held))

    # 단타 익절: 보유가 급등(rip)하면 AI Hold여도 매도 후보로 승격
    if rip_exits and (
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

    # Near/at goal → prefer sell/reduce, shrink or skip buys
    # Behind deadline → slightly larger tickets within hard caps (still capped)
    max_n = min(live_max_notional(), first_trade_notional() * 1.25)
    near_goal = bool(gprog["set"] and gprog["pct"] >= 0.9)
    reached = bool(gprog.get("reached"))
    far_from_goal = bool(gprog["set"] and gprog["pct"] < 0.5)
    if reached or near_goal:
        max_n = min(max_n, first_trade_notional())
        prog("목표 근접/달성 · 공격 매수 축소, 약한 종목 정리 우선")
    elif urgency >= 0.55:
        max_n = min(live_max_notional(), first_trade_notional() * (1.75 if urgency >= 0.75 else 1.5))
        prog(f"생존 압박 urgency={urgency:.2f} · 고엣지 종목에 집중 집행 (한도 내)")
    elif far_from_goal:
        max_n = min(live_max_notional(), first_trade_notional() * 1.5)
        prog("목표까지 여유 · 단타 눌림·장타 추세 소액 집중")

    msgs: list[str] = []
    executed = 0

    prog("③ 매수·매도 후보 선택 (단타=싸게사고비싸게팔기)")
    if best_sell:
        prog(f"매도 후보 {best_sell.symbol} · {best_sell.action.value} · conf={best_sell.confidence:.2f}")
    if best_buy and not (near_goal or reached):
        prog(f"매수 후보 {best_buy.symbol} · {best_buy.action.value} · conf={best_buy.confidence:.2f}")
    elif best_buy and (near_goal or reached):
        prog(f"매수 후보 {best_buy.symbol} 보류 · 목표 근접/달성")
        best_buy = None

    for label, dec in (("SELL", best_sell), ("BUY", best_buy)):
        if dec is None:
            continue
        prog(f"④ 실제 주문 실행 · {label} {dec.symbol}")
        out = _execute_decision(dec, max_n=max_n)
        msgs.append(f"[{label}] {out['message']}")
        prog(out["message"])
        if out.get("ok"):
            executed += 1
        if executed >= 2:
            break

    if not msgs and not (near_goal or reached):
        # Fallback: take strongest short then strongest long from screen
        from oracle.core.types import DecisionResult as DR
        from oracle.core.types import RiskVeto
        from oracle.agents.risk_manager import RiskManagerAgent

        for tag, bucket, thresh in (
            ("단타", short_picks, 0.03),
            ("장타", long_picks, 0.04),
        ):
            if executed >= 2:
                break
            if not bucket:
                continue
            top = bucket[0]
            score = top.short_score if tag == "단타" else top.long_score
            if score < thresh:
                continue
            fake = DR(
                symbol=top.symbol,
                action=Action.BUY,
                confidence=0.55,
                composite_score=min(0.65, score * 2),
                rationale=f"SCREEN {tag} · {', '.join(top.reasons)}",
                agent_opinions=[],
                risk_veto=RiskVeto(active=False, reason="screen", confidence=0.5),
            )
            veto = RiskManagerAgent().veto(top.symbol, portfolio)
            if veto.active:
                prog(f"[SCREEN {tag}] {top.symbol} 리스크거부로 스킵")
                continue
            prog(f"스크린 폴백 · {tag} 매수 {top.symbol}")
            out = _execute_decision(fake, max_n=max_n)
            msgs.append(f"[SCREEN {tag}] {out['message']}")
            prog(out["message"])
            executed += int(bool(out.get("ok")))

    if not msgs:
        msg = "AI 판단: 지금은 관망 (강한 매수/매도 엣지 없음)"
        if near_goal:
            msg = "목표 근접 · 관망 유지 (무리한 매수 안 함)"
        _set_last(msg, picks=picks_view)
        return {"ok": True, "message": msg, "run_id": result.run_id, "picks": picks_view}

    msg = " · ".join(msgs)
    _set_last(msg, ok=executed > 0, picks=picks_view)
    return {
        "ok": executed > 0,
        "message": msg,
        "run_id": result.run_id,
        "picks": picks_view,
        "executed": executed,
    }


def _loop() -> None:
    logger.info("Autopilot loop start interval=%ss (browser-independent)", interval_sec())
    _push_log(f"서버 자율매매 루프 시작 · {interval_sec()}초마다 (창 꺼도 계속 동작)")
    time.sleep(3)
    while not _stop.is_set():
        if enabled():
            try:
                run_once()
            except Exception as exc:
                logger.exception("autopilot cycle failed")
                _set_last(f"오류 · {exc}", ok=False)
        else:
            _stop.wait(interval_sec())
            continue
        # Always wait full interval between cycles (browser closed OK)
        _stop.wait(interval_sec())
    logger.info("Autopilot loop stopped")


def start_background() -> None:
    global _thread
    with _lock:
        if _thread and _thread.is_alive():
            return
        _stop.clear()
        _load_state()
        _thread = threading.Thread(target=_loop, daemon=True, name="oracle-autopilot")
        _thread.start()
        logger.info("Autopilot background thread launched (survives browser close)")


def set_enabled(on: bool, *, allow_live: bool = False) -> None:
    updates = {"ORACLE_AUTOPILOT": "1" if on else "0"}
    if allow_live:
        updates["ORACLE_AUTOPILOT_LIVE"] = "1"
    elif not on:
        updates["ORACLE_AUTOPILOT_LIVE"] = "0"
    upsert_env(updates)
    if on:
        start_background()
        _set_last("자율매매 ON · 서버에서 창 꺼도 매수/매도 계속")
    else:
        _set_last("자율매매 OFF")
