"""Sync local portfolio YAML from live/paper broker account."""

from __future__ import annotations

import logging
from pathlib import Path

import yaml

from oracle.config import get_settings, resolve_path
from oracle.core.types import PortfolioPosition, PortfolioState
from oracle.execution.broker import Broker

logger = logging.getLogger("oracle.execution.sync")


def sync_portfolio_from_broker(broker: Broker, path: str | Path | None = None) -> PortfolioState:
    settings = get_settings()
    dest = resolve_path(path or settings.portfolio_path)
    account = broker.get_account()

    # Keep targets from existing file when present
    targets: dict[str, float] = {}
    currency = "USD"
    if dest.exists():
        try:
            raw = yaml.safe_load(dest.read_text(encoding="utf-8")) or {}
            targets = dict(raw.get("targets") or {})
            currency = str(raw.get("currency") or "USD")
        except Exception:
            pass

    positions: list[PortfolioPosition] = []
    # Prefer richer position details when Alpaca
    detailed = getattr(broker, "get_positions_detailed", None)
    if callable(detailed):
        for row in detailed():
            positions.append(
                PortfolioPosition(
                    symbol=row["symbol"],
                    shares=float(row["qty"]),
                    avg_cost=float(row.get("avg_cost") or row.get("current_price") or 0),
                    market_price=float(row.get("current_price") or row.get("avg_cost") or 0) or None,
                )
            )
    else:
        for sym, qty in (account.positions or {}).items():
            if abs(float(qty)) < 1e-9:
                continue
            positions.append(
                PortfolioPosition(symbol=sym, shares=float(qty), avg_cost=0.0, market_price=None)
            )

    state = PortfolioState(
        cash=float(account.cash),
        currency=currency,
        positions=positions,
        targets=targets,
    )
    payload = {
        "cash": state.cash,
        "currency": state.currency,
        "positions": [
            {
                "symbol": p.symbol,
                "shares": p.shares,
                "avg_cost": p.avg_cost,
                **({"market_price": p.market_price} if p.market_price is not None else {}),
            }
            for p in state.positions
        ],
        "targets": state.targets,
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    logger.info("Synced portfolio from broker → %s equity≈%.2f", dest, account.equity)
    return state
