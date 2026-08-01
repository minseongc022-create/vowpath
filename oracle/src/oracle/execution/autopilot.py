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
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
from oracle.portfolio.picker import rank_decisions_for_trade, screen_universe, top_picks_summary
from oracle.portfolio.store import load_portfolio

logger = logging.getLogger("oracle.autopilot")

_lock = threading.Lock()
_cycle_lock = threading.Lock()
_thread: threading.Thread | None = None
_stop = threading.Event()
_last: dict = {"ts": None, "message": "대기", "ok": True, "picks": [], "busy": False, "logs": []}

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


def enabled() -> bool:
    return os.getenv("ORACLE_AUTOPILOT", "").strip().lower() in {"1", "true", "yes"}


def interval_sec() -> int:
    try:
        return max(60, int(os.getenv("ORACLE_AUTOPILOT_INTERVAL_SEC", "300")))
    except ValueError:
        return 300


def status() -> AutopilotStatus:
    return AutopilotStatus(
        enabled=enabled(),
        running=_thread is not None and _thread.is_alive(),
        busy=bool(_last.get("busy")),
        interval_sec=interval_sec(),
        last_ts=_last.get("ts"),
        last_message=str(_last.get("message") or ""),
        last_ok=bool(_last.get("ok", True)),
        picks=list(_last.get("picks") or []),
        logs=list(_last.get("logs") or []),
    )


def _push_log(msg: str) -> None:
    logs = list(_last.get("logs") or [])
    logs.append({"ts": datetime.now(UTC).isoformat(), "text": msg})
    _last["logs"] = logs[-40:]
    _last["message"] = msg
    _last["ts"] = datetime.now(UTC).isoformat()


def _set_last(msg: str, ok: bool = True, picks: list | None = None) -> None:
    _last["ts"] = datetime.now(UTC).isoformat()
    _last["message"] = msg
    _last["ok"] = ok
    if picks is not None:
        _last["picks"] = picks
    _push_log(msg)


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

    live = live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", "paper")
    if live and os.getenv("ORACLE_AUTOPILOT_LIVE", "").strip() not in {"1", "true", "yes"}:
        jid = TradeJournal().add(
            JournalEntry(
                ts=now_iso(),
                symbol=d.symbol,
                action=action,
                shares=shares,
                price=price,
                rationale=f"PICKER queued (live arm needed) · conf={d.confidence:.2f} · {d.rationale[:160]}",
                status="planned",
                client_order_id=f"pick-{uuid.uuid4().hex[:10]}",
            )
        )
        return {"ok": True, "message": f"대기열 #{jid} {d.symbol} {action}", "journal_id": jid, "queued": True}

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
    out = engine.confirm_journal_entry(jid)
    return {
        "ok": out.accepted,
        "message": (
            f"{'체결' if out.accepted else '실패'} {d.symbol} {action} ${abs(shares * price):.2f} · {out.message}"
        ),
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
    if gprog["set"]:
        prog(
            f"목표 ${gprog['goal']:,.0f} · 현재 ${equity:,.2f} · "
            f"{gprog['pct']*100:.0f}% · {gprog['label']}"
        )
        if gprog["reached"]:
            prog(f"목표 달성 · ${equity:,.2f} ≥ ${gprog['goal']:,.0f} · 매수만 멈추고 약한 종목은 정리")

    prog("① 전 종목 스크리닝 · 오를 후보 찾는 중…")
    screened = screen_universe(limit=8)
    picks_view = top_picks_summary(limit=5)
    _last["picks"] = picks_view
    top_syms = [p.symbol for p in screened[:6]]
    if top_syms:
        prog("TOP " + " · ".join(f"{p.symbol}({p.screen_score:+.2f})" for p in screened[:5]))
    held = list(portfolio.held_symbols())
    # Shortlist: holdings + hottest names
    symbols = list(dict.fromkeys([*held, *top_syms, *settings.symbols[:2]]))[:7]

    prog(f"② AI가 상황·주문·리스크 전부 판단 · {', '.join(symbols)}")
    result = OraclePipeline(settings).run(
        session="autopilot",
        symbols=symbols,
        on_progress=prog,
        fast_llm=True,
    )
    best_buy, best_sell = rank_decisions_for_trade(result.decisions, held=set(held))

    # Near/at goal → prefer sell/reduce, shrink or skip buys
    max_n = min(live_max_notional(), first_trade_notional() * 1.25)
    near_goal = bool(gprog["set"] and gprog["pct"] >= 0.9)
    reached = bool(gprog.get("reached"))
    far_from_goal = bool(gprog["set"] and gprog["pct"] < 0.5)
    if reached or near_goal:
        max_n = min(max_n, first_trade_notional())
        prog("목표 근접/달성 · 공격 매수 축소, 약한 종목 정리 우선")
    elif far_from_goal:
        max_n = min(live_max_notional(), first_trade_notional() * 1.5)
        prog("목표까지 여유 · 강한 종목 소액 집중")

    msgs: list[str] = []
    executed = 0

    prog("③ 매수·매도 후보 선택")
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

    if not msgs and not near_goal:
        if screened and screened[0].screen_score > 0.04:
            from oracle.core.types import DecisionResult as DR
            from oracle.core.types import RiskVeto
            from oracle.agents.risk_manager import RiskManagerAgent

            top = screened[0]
            fake = DR(
                symbol=top.symbol,
                action=Action.BUY,
                confidence=0.55,
                composite_score=min(0.6, top.screen_score * 2),
                rationale=f"SCREEN fallback · {', '.join(top.reasons)}",
                agent_opinions=[],
                risk_veto=RiskVeto(active=False, reason="screen", confidence=0.5),
            )
            veto = RiskManagerAgent().veto(top.symbol, portfolio)
            if not veto.active:
                prog(f"스크린 폴백 매수 · {top.symbol}")
                out = _execute_decision(fake, max_n=max_n)
                msgs.append(f"[SCREEN] {out['message']}")
                prog(out["message"])
                executed += int(bool(out.get("ok")))
            else:
                msgs.append(f"[SCREEN] {top.symbol} 리스크거부로 스킵")
                prog(msgs[-1])

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
    _push_log(f"서버 자율매매 루프 시작 · {interval_sec()}초마다 (창 꺼도 동작)")
    time.sleep(3)
    while not _stop.is_set():
        if enabled():
            try:
                run_once()
            except Exception as exc:
                logger.exception("autopilot cycle failed")
                _set_last(f"오류 · {exc}", ok=False)
        _stop.wait(interval_sec())
    logger.info("Autopilot loop stopped")


def start_background() -> None:
    global _thread
    with _lock:
        if _thread and _thread.is_alive():
            return
        _stop.clear()
        _thread = threading.Thread(target=_loop, daemon=True, name="oracle-autopilot")
        _thread.start()


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
