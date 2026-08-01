"""Fact-based stop exits — ATR multiple from avg cost (+ hard % floor)."""

from __future__ import annotations

import logging

from oracle.agents.technical import _atr
from oracle.config import get_settings
from oracle.core.types import Action, DecisionResult, PortfolioState, RiskVeto
from oracle.data.market import cached_history, fetch_snapshot

logger = logging.getLogger("oracle.stops")


def atr_stop_exits(portfolio: PortfolioState) -> list[DecisionResult]:
    """Force SELL/REDUCE when price breaches ATR stop below avg_cost."""
    settings = get_settings()
    k = float(getattr(settings.risk, "atr_stop_multiple", 2.0) or 2.0)
    hard_pct = 0.08  # never let a name bleed more than ~8% from cost without action
    out: list[DecisionResult] = []
    for pos in portfolio.positions:
        sym = pos.symbol
        cost = float(pos.avg_cost or 0.0)
        if cost <= 0 or float(pos.shares or 0) <= 0:
            continue
        try:
            px = float(pos.market_price or 0) or float(fetch_snapshot(sym).price)
            df = cached_history(sym, days=60)
            atr = _atr(df, period=14) if len(df) >= 20 else 0.0
        except Exception:
            logger.debug("atr stop skip %s", sym, exc_info=True)
            continue
        if atr <= 0 or px <= 0:
            continue
        stop = cost - k * atr
        hard = cost * (1.0 - hard_pct)
        breach_atr = px <= stop
        breach_hard = px <= hard
        if not (breach_atr or breach_hard):
            continue
        # Deep breach → full sell; shallow → reduce
        deep = px <= min(stop, hard) * 0.99 or (cost - px) / cost >= hard_pct
        action = Action.SELL if deep else Action.REDUCE
        reason = (
            f"ATR스탑 · px={px:.2f} cost={cost:.2f} atr={atr:.2f} "
            f"stop={stop:.2f} k={k}" + (" · 하드-8%" if breach_hard else "")
        )
        out.append(
            DecisionResult(
                symbol=sym,
                action=action,
                confidence=0.72,
                composite_score=-0.55,
                rationale=reason,
                agent_opinions=[],
                risk_veto=RiskVeto(active=False, reason="atr_stop", confidence=0.7),
            )
        )
    out.sort(key=lambda d: d.composite_score)
    return out
