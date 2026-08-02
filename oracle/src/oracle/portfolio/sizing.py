"""Position sizing — vol-target with hard risk caps (advisory)."""

from __future__ import annotations

from dataclasses import dataclass

from oracle.config import get_settings
from oracle.core.types import Action, DecisionResult, PortfolioState
from oracle.data.market import annualized_volatility, cached_history


@dataclass
class SizeRecommendation:
    symbol: str
    action: Action
    target_weight: float
    suggested_shares_delta: float
    dollar_delta: float
    rationale: str
    confidence: float


def vol_target_weight(symbol: str, target_vol: float = 0.10) -> float:
    """Weight so position vol ≈ target_vol (capped by max_position_pct)."""
    settings = get_settings()
    try:
        rets = cached_history(symbol, days=180)["close"].pct_change().dropna()
        vol = annualized_volatility(rets)
    except Exception:
        vol = 0.25
    if vol <= 1e-6:
        raw = settings.risk.max_position_pct
    else:
        raw = target_vol / vol
    return max(0.0, min(settings.risk.max_position_pct, raw))


def size_decision(
    decision: DecisionResult,
    portfolio: PortfolioState,
    target_vol: float = 0.10,
) -> SizeRecommendation:
    settings = get_settings()
    equity = max(portfolio.equity(), 1.0)
    current_w = portfolio.weight(decision.symbol)
    price = None
    for p in portfolio.positions:
        if p.symbol == decision.symbol and p.market_price:
            price = p.market_price
            break
    if price is None:
        from oracle.data.market import fetch_snapshot

        price = fetch_snapshot(decision.symbol).price

    action = decision.action
    if action in (Action.DO_NOTHING, Action.HOLD):
        return SizeRecommendation(
            symbol=decision.symbol,
            action=action,
            target_weight=current_w,
            suggested_shares_delta=0.0,
            dollar_delta=0.0,
            rationale="No trade — inaction preserves optionality under risk-first mandate.",
            confidence=decision.confidence,
        )

    ideal = vol_target_weight(decision.symbol, target_vol=target_vol)
    target_from_book = portfolio.targets.get(decision.symbol, ideal)
    target_w = min(ideal, target_from_book) if target_from_book > 0 else ideal

    if action == Action.BUY:
        desired = target_w
    elif action == Action.ADD:
        desired = min(settings.risk.max_position_pct, max(current_w, (current_w + target_w) / 2))
    elif action == Action.REDUCE:
        desired = max(0.0, current_w * 0.5)
    elif action == Action.SELL:
        desired = 0.0
    else:
        desired = current_w

    # Cash floor
    cash_pct = portfolio.cash / equity
    if action in (Action.BUY, Action.ADD) and cash_pct < settings.risk.min_cash_pct:
        return SizeRecommendation(
            symbol=decision.symbol,
            action=Action.DO_NOTHING,
            target_weight=current_w,
            suggested_shares_delta=0.0,
            dollar_delta=0.0,
            rationale=f"Blocked by cash floor ({cash_pct:.1%} < {settings.risk.min_cash_pct:.1%}).",
            confidence=decision.confidence,
        )

    dollar_delta = (desired - current_w) * equity
    shares = dollar_delta / price if price else 0.0
    return SizeRecommendation(
        symbol=decision.symbol,
        action=action,
        target_weight=desired,
        suggested_shares_delta=shares,
        dollar_delta=dollar_delta,
        rationale=(
            f"Vol-target weight≈{ideal:.1%}, book target→{desired:.1%} "
            f"(from {current_w:.1%}), conf={decision.confidence:.2f}."
        ),
        confidence=decision.confidence,
    )
