"""Portfolio Manager Agent — weights, drift vs targets, concentration."""

from __future__ import annotations

import logging

from oracle.agents.base import opinion
from oracle.config import get_settings
from oracle.core.types import AgentName, Evidence, PortfolioState

logger = logging.getLogger("oracle.agents.portfolio_manager")


class PortfolioManagerAgent:
    name = AgentName.PORTFOLIO_MANAGER.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        settings = get_settings()
        equity = portfolio.equity()
        weight = portfolio.weight(symbol)
        target = portfolio.targets.get(symbol, 0.0)
        cash_pct = portfolio.cash / equity if equity > 0 else 1.0

        evidence: list[Evidence] = [
            Evidence(
                claim=f"Current weight {weight:.1%}",
                metric="weight",
                value=weight,
                source="portfolio",
            ),
            Evidence(
                claim=f"Target weight {target:.1%}",
                metric="target_weight",
                value=target,
                source="portfolio.targets",
            ),
            Evidence(
                claim=f"Cash buffer {cash_pct:.1%}",
                metric="cash_pct",
                value=cash_pct,
                source="portfolio",
            ),
        ]

        drift = target - weight
        # Positive drift → underweight → lean Buy/Add; negative → Reduce/Sell
        score = max(-1.0, min(1.0, drift / max(settings.risk.max_position_pct, 1e-6)))

        # Concentration penalty if already oversized
        if weight > settings.risk.max_position_pct:
            score = min(score, -0.6)
            evidence.append(
                Evidence(
                    claim=(
                        f"Position {weight:.1%} exceeds max "
                        f"{settings.risk.max_position_pct:.1%}"
                    ),
                    metric="overweight",
                    value=weight,
                    source="risk.max_position_pct",
                )
            )

        if cash_pct < settings.risk.min_cash_pct and drift > 0:
            score = min(score, 0.0)
            evidence.append(
                Evidence(
                    claim=(
                        f"Cash {cash_pct:.1%} below minimum "
                        f"{settings.risk.min_cash_pct:.1%} — block adds"
                    ),
                    metric="cash_floor",
                    value=cash_pct,
                    source="risk.min_cash_pct",
                )
            )

        # Unrealized PnL context
        for pos in portfolio.positions:
            if pos.symbol == symbol and pos.unrealized_pnl_pct is not None:
                evidence.append(
                    Evidence(
                        claim=f"Unrealized PnL {pos.unrealized_pnl_pct:.1%}",
                        metric="unrealized_pnl_pct",
                        value=pos.unrealized_pnl_pct,
                        source="portfolio",
                    )
                )

        conf = 0.55 if symbol in portfolio.targets or held else 0.4
        if not held and target <= 0:
            score = 0.0
            summary = (
                f"{symbol} is not a target holding and not held. "
                "Portfolio Manager prefers Do Nothing until targets change."
            )
        else:
            summary = (
                f"Allocation drift for {symbol}: target={target:.1%}, actual={weight:.1%}, "
                f"drift={drift:+.1%}. Rebalance suggestions are mechanical, not alpha claims."
            )

        return opinion(
            AgentName.PORTFOLIO_MANAGER,
            symbol,
            score,
            conf,
            summary,
            evidence,
            held,
            metadata={"weight": weight, "target": target, "drift": drift, "cash_pct": cash_pct},
        )
