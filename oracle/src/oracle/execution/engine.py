"""Paper / broker execution with human confirm + kill switch + hardening."""

from __future__ import annotations

import logging
import os
import uuid
from dataclasses import dataclass
from pathlib import Path

import yaml

from oracle.config import get_settings, resolve_path
from oracle.core.types import Action, DecisionResult, PortfolioPosition, PortfolioState
from oracle.execution.broker import Broker, BrokerOrder
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
    order_id: str | None = None


class KillSwitch:
    def __init__(self, max_daily_loss_pct: float = 0.03) -> None:
        self.max_daily_loss_pct = max_daily_loss_pct

    @property
    def _manual(self) -> bool:
        return os.getenv("ORACLE_KILL_SWITCH", "").strip().lower() in {"1", "true", "yes"}

    def engage(self) -> None:
        os.environ["ORACLE_KILL_SWITCH"] = "1"

    def release(self) -> None:
        os.environ["ORACLE_KILL_SWITCH"] = "0"

    def check(self, day_pnl_pct: float = 0.0) -> KillSwitchState:
        if self._manual:
            return KillSwitchState(
                True, "Manual ORACLE_KILL_SWITCH engaged", self.max_daily_loss_pct, day_pnl_pct
            )
        if day_pnl_pct <= -abs(self.max_daily_loss_pct):
            return KillSwitchState(
                True,
                f"Daily loss {day_pnl_pct:.2%} breached -{self.max_daily_loss_pct:.2%}",
                self.max_daily_loss_pct,
                day_pnl_pct,
            )
        return KillSwitchState(False, "OK", self.max_daily_loss_pct, day_pnl_pct)


def estimate_day_pnl_pct(portfolio: PortfolioState) -> float:
    """Approximate day PnL from previous_close vs mark (when available)."""
    from oracle.data.market import fetch_snapshot

    pnl = 0.0
    base = 0.0
    for p in portfolio.positions:
        try:
            snap = fetch_snapshot(p.symbol)
            prev = snap.previous_close or snap.price
            px = snap.price
            value_prev = p.shares * prev
            value_now = p.shares * px
            pnl += value_now - value_prev
            base += value_prev
        except Exception:
            continue
    base += portfolio.cash
    if base <= 0:
        return 0.0
    return pnl / base


def _save_portfolio_yaml(state: PortfolioState, path: Path) -> None:
    payload = {
        "cash": round(state.cash, 2),
        "currency": state.currency,
        "positions": [
            {
                "symbol": p.symbol,
                "shares": float(p.shares),
                "avg_cost": float(p.avg_cost),
            }
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
    commission: float = 0.0,
) -> PortfolioState:
    """Apply buy (+) / sell (-) with oversell + cash guards."""
    if price <= 0:
        raise ValueError("price must be positive")
    positions = {p.symbol: p for p in state.positions}
    held = positions[symbol].shares if symbol in positions else 0.0
    if shares_delta < 0 and abs(shares_delta) > held + 1e-9:
        raise ValueError(f"Oversell blocked: have {held}, sell {abs(shares_delta)}")

    notional = shares_delta * price
    cash = state.cash - notional - abs(commission)
    if cash < -1e-6:
        raise ValueError(f"Insufficient cash for fill (would be {cash:.2f})")

    if symbol in positions:
        pos = positions[symbol]
        new_shares = pos.shares + shares_delta
        if shares_delta > 0:
            total_cost = pos.avg_cost * pos.shares + price * shares_delta
            avg = total_cost / new_shares if new_shares else 0.0
        else:
            avg = pos.avg_cost
        if new_shares <= 1e-9:
            positions.pop(symbol)
        else:
            positions[symbol] = PortfolioPosition(
                symbol=symbol,
                shares=new_shares,
                avg_cost=avg,
                market_price=price,
            )
    elif shares_delta > 0:
        positions[symbol] = PortfolioPosition(
            symbol=symbol,
            shares=shares_delta,
            avg_cost=price,
            market_price=price,
        )
    elif shares_delta < 0:
        raise ValueError("Cannot sell a symbol not held")

    return PortfolioState(
        cash=cash,
        currency=state.currency,
        positions=list(positions.values()),
        targets=state.targets,
    )


def get_broker() -> Broker | None:
    """Return Alpaca broker when credentials exist; else None (local paper)."""
    if os.getenv("ORACLE_BROKER", "auto").strip().lower() in {"none", "paper", "local"}:
        return None
    from oracle.execution.alpaca import alpaca_configured

    if not alpaca_configured():
        return None
    from oracle.execution.alpaca import AlpacaBroker

    return AlpacaBroker()


class ExecutionEngine:
    def __init__(self, require_confirm: bool | None = None, broker: Broker | None = None) -> None:
        # Default: no human approval — AI executes end-to-end (Paper/Live caps still apply).
        if require_confirm is None:
            require_confirm = os.getenv("ORACLE_REQUIRE_CONFIRM", "").strip().lower() in {
                "1",
                "true",
                "yes",
            }
        self.require_confirm = require_confirm
        self.kill = KillSwitch(max_daily_loss_pct=float(os.getenv("ORACLE_MAX_DAILY_LOSS", "0.03")))
        self.journal = TradeJournal()
        self.broker = broker if broker is not None else get_broker()
        live_flag = os.getenv("ORACLE_LIVE_TRADING", "").strip().lower() in {"1", "true", "yes"}
        if self.broker is not None:
            self.mode = "alpaca" if not live_flag or "paper" in getattr(self.broker, "base_url", "") else "live"
            # Prefer labeling paper API as alpaca_paper
            base = getattr(self.broker, "base_url", "")
            if "paper" in str(base):
                self.mode = "alpaca_paper"
            elif live_flag:
                self.mode = "alpaca_live"
            else:
                self.mode = "alpaca_paper"
        else:
            self.mode = "paper"

    def execute_decision(
        self,
        decision: DecisionResult,
        portfolio: PortfolioState | None = None,
        confirm: bool = False,
        day_pnl_pct: float | None = None,
        client_order_id: str | None = None,
    ) -> ExecutionResult:
        settings = get_settings()
        portfolio = portfolio or load_portfolio(settings.portfolio_path)
        if day_pnl_pct is None:
            if self.broker is not None:
                try:
                    day_pnl_pct = self.broker.get_account().day_pnl_pct
                except Exception:
                    day_pnl_pct = estimate_day_pnl_pct(portfolio)
            else:
                day_pnl_pct = estimate_day_pnl_pct(portfolio)

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
                    status="cancelled",
                )
            )
            return ExecutionResult(True, self.mode, sizing.rationale, journal_id=jid)

        price = abs(sizing.dollar_delta / sizing.suggested_shares_delta)
        client_order_id = client_order_id or f"oracle-{decision.symbol}-{uuid.uuid4().hex[:10]}"

        if self.require_confirm and not confirm:
            jid = self.journal.add(
                JournalEntry(
                    ts=now_iso(),
                    symbol=decision.symbol,
                    action=decision.action.value,
                    shares=sizing.suggested_shares_delta,
                    price=price,
                    rationale=f"AWAITING CONFIRM — {sizing.rationale}",
                    status="planned",
                    client_order_id=client_order_id,
                )
            )
            return ExecutionResult(
                False,
                self.mode,
                f"Human confirm required (journal #{jid}). Approve via dashboard or --confirm.",
                journal_id=jid,
            )

        # Broker path
        if self.broker is not None:
            if self.mode == "alpaca_live" and os.getenv("ORACLE_LIVE_TRADING", "").strip() not in {
                "1",
                "true",
                "TRUE",
                "yes",
            }:
                return ExecutionResult(
                    False,
                    self.mode,
                    "Live trading blocked. Set ORACLE_LIVE_TRADING=1 explicitly.",
                )
            # Hard cap live / first-session notional
            from oracle.execution.live_setup import live_max_notional

            max_n = live_max_notional()
            notional = abs(sizing.suggested_shares_delta * price)
            if notional > max_n + 1e-6:
                scale = max_n / notional
                sizing.suggested_shares_delta *= scale
                sizing.dollar_delta *= scale
                sizing.rationale += f" | CAP notional→${max_n:.2f}"
                logger.warning("Capped order notional to $%.2f for safety", max_n)

            try:
                fill = self.broker.submit_market_order(
                    BrokerOrder(
                        symbol=decision.symbol,
                        qty=sizing.suggested_shares_delta,
                        side="buy" if sizing.suggested_shares_delta > 0 else "sell",
                        client_order_id=client_order_id,
                    )
                )
            except Exception as exc:
                jid = self.journal.add(
                    JournalEntry(
                        ts=now_iso(),
                        symbol=decision.symbol,
                        action=decision.action.value,
                        shares=sizing.suggested_shares_delta,
                        price=price,
                        rationale=f"BROKER ERROR: {exc}",
                        status="rejected",
                        client_order_id=client_order_id,
                    )
                )
                return ExecutionResult(False, self.mode, f"Broker error: {exc}", journal_id=jid)

            fill_price = fill.price or price
            jid = self.journal.add(
                JournalEntry(
                    ts=now_iso(),
                    symbol=decision.symbol,
                    action=decision.action.value,
                    shares=fill.qty,
                    price=fill_price,
                    rationale=sizing.rationale + f" | BROKER {fill.status}",
                    status="filled" if fill.status in {"filled", "partially_filled", "accepted", "new", "submitted"} else fill.status,
                    client_order_id=client_order_id,
                )
            )
            try:
                from oracle.execution.sync import sync_portfolio_from_broker

                sync_portfolio_from_broker(self.broker)
            except Exception:
                logger.exception("portfolio sync after broker fill failed")
            return ExecutionResult(
                True,
                self.mode,
                f"Broker order {fill.order_id} status={fill.status}",
                journal_id=jid,
                order_id=fill.order_id,
            )

        # Local paper fill with costs
        bps = (settings.commission_bps + settings.slippage_bps) / 10_000.0
        slip_price = price * (1 + bps) if sizing.suggested_shares_delta > 0 else price * (1 - bps)
        commission = abs(sizing.suggested_shares_delta * slip_price) * (settings.commission_bps / 10_000.0)
        try:
            new_state = apply_paper_fill(
                portfolio,
                decision.symbol,
                sizing.suggested_shares_delta,
                slip_price,
                commission=commission,
            )
        except ValueError as exc:
            return ExecutionResult(False, self.mode, str(exc))

        path = resolve_path(settings.portfolio_path)
        _save_portfolio_yaml(new_state, path)
        jid = self.journal.add(
            JournalEntry(
                ts=now_iso(),
                symbol=decision.symbol,
                action=decision.action.value,
                shares=sizing.suggested_shares_delta,
                price=slip_price,
                rationale=sizing.rationale + " | PAPER FILLED",
                status="filled",
                client_order_id=client_order_id,
            )
        )
        logger.info(
            "Paper filled %s %+.4f @ %.2f (commission=%.2f)",
            decision.symbol,
            sizing.suggested_shares_delta,
            slip_price,
            commission,
        )
        return ExecutionResult(True, self.mode, "Paper fill applied", journal_id=jid)

    def confirm_journal_entry(self, entry_id: int) -> ExecutionResult:
        """Approve a planned journal row and execute it."""
        row = self.journal.get(entry_id)
        if not row:
            return ExecutionResult(False, self.mode, f"Journal #{entry_id} not found")
        if row["status"] != "planned":
            return ExecutionResult(False, self.mode, f"Journal #{entry_id} status={row['status']}")

        settings = get_settings()
        portfolio = load_portfolio(settings.portfolio_path)
        # Reconstruct a minimal DecisionResult
        from oracle.core.types import DecisionResult as DR

        decision = DR(
            symbol=row["symbol"],
            action=Action(row["action"]),
            confidence=0.5,
            composite_score=0.0,
            rationale=row.get("rationale") or "journal confirm",
            agent_opinions=[],
            risk_veto=None,
        )
        # Bypass size recompute: force shares via temporary Decision path
        # Mark planned as cancelled then create fill using stored shares
        shares = float(row["shares"])
        price = float(row["price"])
        if abs(shares) < 1e-9:
            self.journal.update_status(entry_id, "cancelled")
            return ExecutionResult(True, self.mode, "Zero-size planned entry cancelled", journal_id=entry_id)

        ks = self.kill.check(estimate_day_pnl_pct(portfolio))
        if ks.active and shares > 0:
            return ExecutionResult(False, self.mode, f"Kill switch: {ks.reason}")

        client_order_id = row.get("client_order_id") or f"oracle-j{entry_id}"

        if self.broker is not None:
            # Cap planned confirms too
            from oracle.execution.live_setup import live_max_notional

            max_n = live_max_notional()
            notional = abs(shares * price)
            if price > 0 and notional > max_n + 1e-6:
                shares = (max_n / price) * (1 if shares > 0 else -1)
                logger.warning("Capped confirm notional to $%.2f", max_n)
            try:
                fill = self.broker.submit_market_order(
                    BrokerOrder(symbol=row["symbol"], qty=shares, side="buy" if shares > 0 else "sell", client_order_id=client_order_id)
                )
            except Exception as exc:
                self.journal.update_status(entry_id, "rejected")
                return ExecutionResult(False, self.mode, f"Broker error: {exc}", journal_id=entry_id)
            self.journal.update_status(entry_id, "filled")
            try:
                from oracle.execution.sync import sync_portfolio_from_broker

                sync_portfolio_from_broker(self.broker)
            except Exception:
                logger.exception("portfolio sync after confirm failed")
            return ExecutionResult(True, self.mode, f"Broker filled {fill.order_id}", journal_id=entry_id, order_id=fill.order_id)

        try:
            new_state = apply_paper_fill(portfolio, row["symbol"], shares, price)
        except ValueError as exc:
            return ExecutionResult(False, self.mode, str(exc), journal_id=entry_id)
        _save_portfolio_yaml(new_state, resolve_path(settings.portfolio_path))
        self.journal.update_status(entry_id, "filled")
        # silence unused
        _ = decision
        return ExecutionResult(True, self.mode, f"Paper confirmed journal #{entry_id}", journal_id=entry_id)

    def reject_journal_entry(self, entry_id: int) -> ExecutionResult:
        row = self.journal.get(entry_id)
        if not row:
            return ExecutionResult(False, self.mode, "Not found")
        if row["status"] != "planned":
            return ExecutionResult(False, self.mode, f"Cannot reject status={row['status']}")
        self.journal.update_status(entry_id, "rejected")
        return ExecutionResult(True, self.mode, f"Rejected journal #{entry_id}", journal_id=entry_id)
