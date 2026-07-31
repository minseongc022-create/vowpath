"""Paper / live execution with human confirm + kill switch.

MVP live mode refuses broker orders until ORACLE_LIVE_TRADING=1 and a broker
adapter is configured. Paper mode mutates portfolio.yaml safely.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

import yaml

from oracle.config import get_settings, resolve_path
from oracle.core.types import Action, DecisionResult, PortfolioState
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
from oracle.portfolio.sizing import size_decision
from oracle.portfolio.store import load_portfolio

logger = logging.getLogger("oracle.execution")


@dataclass
class KillSwitchState:
    active: bool
    reason: str
    max_daily_loss_pct: float
    day_pnl_pct: float


@dataclass
class ExecutionResult:
    accepted: bool
    mode: str
    message: str
    journal_id: int | None = None


class KillSwitch:
    def __init__(self, max_daily_loss_pct: float = 0.03) -> None:
        self.max_daily_loss_pct = max_daily_loss_pct
        self._manual = os.getenv("ORACLE_KILL_SWITCH", "").strip() in {"1", "true", "TRUE"}

    def check(self, day_pnl_pct: float = 0.0) -> KillSwitchState:
        if self._manual:
            return KillSwitchState(True, "Manual ORACLE_KILL_SWITCH engaged", self.max_daily_loss_pct, day_pnl_pct)
        if day_pnl_pct <= -abs(self.max_daily_loss_pct):
            return KillSwitchState(
                True,
                f"Daily loss {day_pnl_pct:.2%} breached -{self.max_daily_loss_pct:.2%}",
                self.max_daily_loss_pct,
                day_pnl_pct,
            )
        return KillSwitchState(False, "OK", self.max_daily_loss_pct, day_pnl_pct)


def _save_portfolio_yaml(state: PortfolioState, path: Path) -> None:
    payload = {
        "cash": state.cash,
        "currency": state.currency,
        "positions": [
            {"symbol": p.symbol, "shares": p.shares, "avg_cost": p.avg_cost}
            for p in state.positions
            if p.shares > 1e-9
        ],
        "targets": state.targets,
    }
    path.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")


def apply_paper_fill(
    state: PortfolioState,
    symbol: str,
    shares_delta: float,
    price: float,
) -> PortfolioState:
    """Apply buy (positive delta) / sell (negative) to in-memory portfolio."""
    cash = state.cash - shares_delta * price
    positions = {p.symbol: p for p in state.positions}
    if symbol in positions:
        pos = positions[symbol]
        new_shares = pos.shares + shares_delta
        if shares_delta > 0:
            # average up
            total_cost = pos.avg_cost * pos.shares + price * shares_delta
            avg = total_cost / new_shares if new_shares else 0.0
        else:
            avg = pos.avg_cost
        if new_shares <= 1e-9:
            positions.pop(symbol)
        else:
            from oracle.core.types import PortfolioPosition

            positions[symbol] = PortfolioPosition(
                symbol=symbol,
                shares=new_shares,
                avg_cost=avg,
                market_price=price,
            )
    elif shares_delta > 0:
        from oracle.core.types import PortfolioPosition

        positions[symbol] = PortfolioPosition(
            symbol=symbol,
            shares=shares_delta,
            avg_cost=price,
            market_price=price,
        )
    return PortfolioState(
        cash=cash,
        currency=state.currency,
        positions=list(positions.values()),
        targets=state.targets,
    )


class ExecutionEngine:
    def __init__(self, require_confirm: bool = True) -> None:
        self.require_confirm = require_confirm
        self.kill = KillSwitch(
            max_daily_loss_pct=float(os.getenv("ORACLE_MAX_DAILY_LOSS", "0.03"))
        )
        self.journal = TradeJournal()
        self.mode = "live" if os.getenv("ORACLE_LIVE_TRADING", "").strip() in {"1", "true"} else "paper"

    def execute_decision(
        self,
        decision: DecisionResult,
        portfolio: PortfolioState | None = None,
        confirm: bool = False,
        day_pnl_pct: float = 0.0,
    ) -> ExecutionResult:
        settings = get_settings()
        portfolio = portfolio or load_portfolio(settings.portfolio_path)
        ks = self.kill.check(day_pnl_pct)
        if ks.active and decision.action in (Action.BUY, Action.ADD):
            return ExecutionResult(False, self.mode, f"Kill switch: {ks.reason}")

        if decision.risk_veto and decision.risk_veto.active and decision.action in (
            Action.BUY,
            Action.ADD,
        ):
            return ExecutionResult(False, self.mode, f"Risk veto: {decision.risk_veto.reason}")

        sizing = size_decision(decision, portfolio)
        if abs(sizing.suggested_shares_delta) < 1e-9:
            jid = self.journal.add(
                JournalEntry(
                    ts=now_iso(),
                    symbol=decision.symbol,
                    action=decision.action.value,
                    shares=0.0,
                    price=0.0,
                    rationale=sizing.rationale,
                    run_id=None,
                    status="cancelled",
                )
            )
            return ExecutionResult(True, self.mode, sizing.rationale, journal_id=jid)

        if self.require_confirm and not confirm:
            jid = self.journal.add(
                JournalEntry(
                    ts=now_iso(),
                    symbol=decision.symbol,
                    action=decision.action.value,
                    shares=sizing.suggested_shares_delta,
                    price=abs(sizing.dollar_delta / sizing.suggested_shares_delta),
                    rationale=f"AWAITING CONFIRM — {sizing.rationale}",
                    status="planned",
                )
            )
            return ExecutionResult(
                False,
                self.mode,
                f"Human confirm required (journal #{jid}). Re-run with --confirm.",
                journal_id=jid,
            )

        if self.mode == "live":
            return ExecutionResult(
                False,
                self.mode,
                "Live broker adapter not configured. Set paper mode or integrate IBKR/Alpaca.",
            )

        # Paper fill
        price = abs(sizing.dollar_delta / sizing.suggested_shares_delta)
        new_state = apply_paper_fill(portfolio, decision.symbol, sizing.suggested_shares_delta, price)
        if new_state.cash < 0:
            return ExecutionResult(False, self.mode, "Insufficient cash for paper fill")
        path = resolve_path(settings.portfolio_path)
        _save_portfolio_yaml(new_state, path)
        jid = self.journal.add(
            JournalEntry(
                ts=now_iso(),
                symbol=decision.symbol,
                action=decision.action.value,
                shares=sizing.suggested_shares_delta,
                price=price,
                rationale=sizing.rationale + " | PAPER FILLED",
                status="filled",
            )
        )
        logger.info("Paper filled %s %+.4f @ %.2f", decision.symbol, sizing.suggested_shares_delta, price)
        return ExecutionResult(True, self.mode, "Paper fill applied", journal_id=jid)
