"""Autopilot — AI analyzes news/agents and executes within hard caps.

Safety:
- Kill switch / risk veto still apply
- Per-order notional cap (ORACLE_LIVE_MAX_NOTIONAL / first trade size)
- Max one actionable fill per cycle
- Live requires ORACLE_AUTOPILOT=1 and live armed; paper/broker paper allowed when enabled
"""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass
from datetime import UTC, datetime

from oracle.config import get_settings
from oracle.core.types import Action
from oracle.execution.engine import ExecutionEngine, KillSwitch, estimate_day_pnl_pct
from oracle.execution.live_setup import first_trade_notional, live_armed, live_max_notional, upsert_env
from oracle.orchestration import OraclePipeline
from oracle.portfolio.store import load_portfolio

logger = logging.getLogger("oracle.autopilot")

_lock = threading.Lock()
_thread: threading.Thread | None = None
_stop = threading.Event()
_last: dict = {"ts": None, "message": "대기", "ok": True}


@dataclass
class AutopilotStatus:
    enabled: bool
    running: bool
    interval_sec: int
    last_ts: str | None
    last_message: str
    last_ok: bool


def enabled() -> bool:
    return os.getenv("ORACLE_AUTOPILOT", "").strip().lower() in {"1", "true", "yes"}


def interval_sec() -> int:
    try:
        return max(120, int(os.getenv("ORACLE_AUTOPILOT_INTERVAL_SEC", "900")))
    except ValueError:
        return 900


def status() -> AutopilotStatus:
    return AutopilotStatus(
        enabled=enabled(),
        running=_thread is not None and _thread.is_alive(),
        interval_sec=interval_sec(),
        last_ts=_last.get("ts"),
        last_message=str(_last.get("message") or ""),
        last_ok=bool(_last.get("ok", True)),
    )


def _set_last(msg: str, ok: bool = True) -> None:
    _last["ts"] = datetime.now(UTC).isoformat()
    _last["message"] = msg
    _last["ok"] = ok


def run_once() -> dict:
    """One autopilot cycle: analyze → pick best action → execute capped size."""
    if not enabled():
        return {"ok": False, "message": "자율매매 OFF"}

    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    if ks.active:
        msg = f"긴급정지로 스킵 · {ks.reason}"
        _set_last(msg, ok=False)
        return {"ok": False, "message": msg}

    # Prefer liquid symbols + holdings for speed
    symbols = list(dict.fromkeys([*(p.symbol for p in portfolio.positions), *settings.symbols[:8]]))
    result = OraclePipeline(settings).run(session="autopilot", symbols=symbols[:8])

    # Rank actionable decisions by |score| * confidence, respect veto
    candidates = []
    for d in result.decisions:
        if d.action in (Action.HOLD, Action.DO_NOTHING):
            continue
        if d.risk_veto and d.risk_veto.active and d.action in (Action.BUY, Action.ADD):
            continue
        if d.confidence < 0.45:
            continue
        score = abs(d.composite_score) * d.confidence
        candidates.append((score, d))
    candidates.sort(key=lambda x: x[0], reverse=True)

    if not candidates:
        msg = "AI 판단: 지금은 관망 (실행할 엣지 없음)"
        _set_last(msg)
        return {"ok": True, "message": msg, "run_id": result.run_id}

    _, best = candidates[0]
    # Cap size via env first-trade notional for autopilot buys
    max_n = min(live_max_notional(), first_trade_notional() * 1.25)
    engine = ExecutionEngine(require_confirm=False)

    # Force small notional for buy/add by cloning decision through journal path
    from oracle.data.market import fetch_snapshot
    from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
    import uuid

    price = float(fetch_snapshot(best.symbol).price)
    if best.action in (Action.BUY, Action.ADD):
        shares = max_n / price if price else 0.0
        side_positive = True
    elif best.action in (Action.REDUCE, Action.SELL):
        held = 0.0
        for p in portfolio.positions:
            if p.symbol == best.symbol:
                held = float(p.shares)
                break
        if held <= 0:
            msg = f"{best.symbol} 매도 신호지만 보유 없음 · 스킵"
            _set_last(msg)
            return {"ok": True, "message": msg, "run_id": result.run_id}
        # sell up to max_n notional or all
        shares = -min(held, max_n / price if price else held)
        side_positive = False
    else:
        msg = f"미지원 액션 {best.action.value}"
        _set_last(msg, ok=False)
        return {"ok": False, "message": msg}

    # Live autopilot still allowed only if live armed; engine caps apply
    if live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", "paper"):
        if os.getenv("ORACLE_AUTOPILOT_LIVE", "").strip() not in {"1", "true", "yes"}:
            msg = "실거래 자율매매는 ORACLE_AUTOPILOT_LIVE=1 필요 · 주문만 대기열에 넣음"
            jid = TradeJournal().add(
                JournalEntry(
                    ts=now_iso(),
                    symbol=best.symbol,
                    action=best.action.value,
                    shares=shares,
                    price=price,
                    rationale=f"AUTOPILOT queued (live confirm needed) · {best.rationale[:200]}",
                    status="planned",
                    client_order_id=f"auto-{uuid.uuid4().hex[:10]}",
                )
            )
            _set_last(f"{msg} · journal #{jid}")
            return {"ok": True, "message": _last["message"], "run_id": result.run_id, "journal_id": jid}

    jid = TradeJournal().add(
        JournalEntry(
            ts=now_iso(),
            symbol=best.symbol,
            action=best.action.value,
            shares=shares,
            price=price,
            rationale=f"AUTOPILOT · AI {best.action.value} · conf={best.confidence:.2f} · {best.rationale[:180]}",
            status="planned",
            client_order_id=f"auto-{uuid.uuid4().hex[:10]}",
        )
    )
    out = engine.confirm_journal_entry(jid)
    msg = (
        f"자율매매 체결 · {best.symbol} {best.action.value} "
        f"${abs(shares * price):.2f} · {out.message}"
        if out.accepted
        else f"자율매매 실패 · {out.message}"
    )
    _set_last(msg, ok=out.accepted)
    return {"ok": out.accepted, "message": msg, "run_id": result.run_id, "journal_id": jid}


def _loop() -> None:
    logger.info("Autopilot loop start interval=%ss", interval_sec())
    # small delay so server finishes boot
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
        _set_last("자율매매 ON · 다음 사이클에서 AI가 판단·실행")
    else:
        _set_last("자율매매 OFF")
