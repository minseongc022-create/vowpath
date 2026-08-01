"""Risk Manager — highest priority. Can veto Buy/Add."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from oracle.agents.base import opinion
from oracle.config import get_settings
from oracle.core.types import (
    Action,
    AgentName,
    Evidence,
    PortfolioState,
    RiskVeto,
)
from oracle.data.market import annualized_volatility, cached_history, correlation, max_drawdown

logger = logging.getLogger("oracle.agents.risk_manager")


class RiskManagerAgent:
    name = AgentName.RISK_MANAGER.value

    def evaluate_portfolio(self, portfolio: PortfolioState) -> tuple[float, list[Evidence]]:
        """Return portfolio risk score in [0,1] (1 = extreme) + evidence."""
        settings = get_settings()
        evidence: list[Evidence] = []
        score = 0.0
        equity = portfolio.equity()
        cash_pct = portfolio.cash / equity if equity > 0 else 1.0

        if cash_pct < settings.risk.min_cash_pct:
            score += 0.25
            evidence.append(
                Evidence(
                    claim=f"Cash {cash_pct:.1%} < min {settings.risk.min_cash_pct:.1%}",
                    metric="cash_pct",
                    value=cash_pct,
                    source="risk",
                )
            )

        for pos in portfolio.positions:
            w = portfolio.weight(pos.symbol)
            if w > settings.risk.max_position_pct:
                score += 0.2
                evidence.append(
                    Evidence(
                        claim=f"{pos.symbol} weight {w:.1%} > max",
                        metric="position_pct",
                        value=w,
                        source="risk",
                    )
                )

        # Portfolio vol estimate from holdings
        symbols = [p.symbol for p in portfolio.positions if p.shares > 0]
        if len(symbols) >= 1:
            try:
                series = []
                weights = []
                for s in symbols:
                    hist = cached_history(s, days=180)["close"].pct_change().dropna()
                    series.append(hist)
                    weights.append(portfolio.weight(s))
                frame = pd.concat(series, axis=1, join="inner").dropna()
                if not frame.empty and sum(weights) > 0:
                    w = np.array(weights[: frame.shape[1]], dtype=float)
                    w = w / w.sum()
                    port_rets = frame.values @ w
                    pvol = float(np.std(port_rets, ddof=1) * np.sqrt(252))
                    evidence.append(
                        Evidence(
                            claim=f"Est. portfolio ann. vol {pvol:.1%}",
                            metric="portfolio_vol",
                            value=pvol,
                            source="risk",
                        )
                    )
                    if pvol > settings.risk.max_portfolio_volatility:
                        score += 0.35
            except Exception as exc:
                logger.warning("portfolio vol calc failed: %s", exc)

        return min(1.0, score), evidence

    def analyze(self, symbol: str, portfolio: PortfolioState):
        """Symbol-level risk opinion (feeds Decision) — often defensive."""
        held = symbol in portfolio.held_symbols()
        settings = get_settings()
        evidence: list[Evidence] = []
        parts: list[float] = []

        weight = portfolio.weight(symbol)
        if weight >= settings.risk.max_position_pct:
            parts.append(-0.8)
            evidence.append(
                Evidence(
                    claim="At/above max position size",
                    metric="weight",
                    value=weight,
                    source="risk",
                )
            )

        try:
            hist = cached_history(symbol, days=180)
            rets = hist["close"].pct_change().dropna()
            vol = annualized_volatility(rets)
            mdd = abs(max_drawdown(hist["close"]))
            evidence.append(
                Evidence(claim=f"Asset vol {vol:.1%}", metric="ann_vol", value=vol, source="risk")
            )
            evidence.append(
                Evidence(claim=f"Asset MDD {mdd:.1%}", metric="mdd", value=mdd, source="risk")
            )
            if vol > 0.45:
                parts.append(-0.5)
            elif vol > 0.30:
                parts.append(-0.2)
            else:
                parts.append(0.1)
            if mdd > settings.risk.max_drawdown_halt:
                parts.append(-0.55)
        except Exception as exc:
            evidence.append(
                Evidence(claim=f"Risk data gap: {exc}", metric="availability", value=0, source="risk")
            )
            parts.append(-0.1)

        # Correlation cluster vs largest holding
        others = [p.symbol for p in portfolio.positions if p.symbol != symbol and p.shares > 0]
        if others:
            top = max(others, key=lambda s: portfolio.weight(s))
            try:
                corr = correlation(symbol, top, days=120)
                evidence.append(
                    Evidence(
                        claim=f"Corr({symbol},{top})={corr:.2f}",
                        metric="corr_top",
                        value=corr,
                        source="risk",
                    )
                )
                if corr >= settings.risk.max_correlation_cluster and not held:
                    parts.append(-0.6)
            except Exception as exc:
                logger.debug("correlation check skipped: %s", exc)

        score = sum(parts) / len(parts) if parts else 0.0
        conf = min(0.85, 0.5 + 0.08 * len(evidence))
        summary = (
            f"Risk view for {symbol}: weight={weight:.1%}. "
            "Risk Manager prioritizes capital preservation over opportunity."
        )
        return opinion(
            AgentName.RISK_MANAGER,
            symbol,
            score,
            conf,
            summary,
            evidence,
            held,
            metadata={"weight": weight},
        )

    def veto(self, symbol: str, portfolio: PortfolioState) -> RiskVeto:
        """Hard override check — if active, Buy/Add are forbidden."""
        settings = get_settings()
        reasons: list[str] = []
        metrics: dict[str, float] = {}
        confidence = 0.6

        equity = portfolio.equity()
        cash_pct = portfolio.cash / equity if equity > 0 else 1.0
        metrics["cash_pct"] = cash_pct
        if cash_pct < settings.risk.min_cash_pct:
            reasons.append(
                f"Cash buffer {cash_pct:.1%} below floor {settings.risk.min_cash_pct:.1%}"
            )
            confidence = max(confidence, 0.75)

        weight = portfolio.weight(symbol)
        metrics["weight"] = weight
        if weight >= settings.risk.max_position_pct:
            reasons.append(
                f"Position weight {weight:.1%} at/above max {settings.risk.max_position_pct:.1%}"
            )
            confidence = max(confidence, 0.8)

        try:
            hist = cached_history(symbol, days=180)
            mdd = abs(max_drawdown(hist["close"]))
            metrics["asset_mdd"] = mdd
            if mdd >= settings.risk.max_drawdown_halt:
                reasons.append(
                    f"Asset drawdown {mdd:.1%} exceeds halt {settings.risk.max_drawdown_halt:.1%}"
                )
                confidence = max(confidence, 0.7)
            vol = annualized_volatility(hist["close"].pct_change().dropna())
            metrics["ann_vol"] = vol
            if vol >= settings.risk.max_portfolio_volatility * 1.5:
                reasons.append(f"Asset volatility {vol:.1%} is extreme vs policy")
                confidence = max(confidence, 0.72)
        except Exception as exc:
            logger.debug("asset risk metrics unavailable: %s", exc)

        port_risk, _ = self.evaluate_portfolio(portfolio)
        metrics["portfolio_risk_score"] = port_risk
        if port_risk >= 0.6:
            reasons.append(f"Portfolio risk score elevated ({port_risk:.2f})")
            confidence = max(confidence, 0.7)

        others = [p.symbol for p in portfolio.positions if p.symbol != symbol and p.shares > 0]
        if others and symbol not in portfolio.held_symbols():
            top = max(others, key=lambda s: portfolio.weight(s))
            try:
                corr = correlation(symbol, top, days=120)
                metrics["corr_top"] = corr
                if corr >= settings.risk.max_correlation_cluster:
                    reasons.append(
                        f"Correlation to {top} ({corr:.2f}) exceeds "
                        f"{settings.risk.max_correlation_cluster:.2f}"
                    )
                    confidence = max(confidence, 0.68)
            except Exception as exc:
                logger.debug("cluster correlation unavailable: %s", exc)

        # Earnings blackout — hard fact gate for new risk
        if symbol not in portfolio.held_symbols():
            try:
                from oracle.data.earnings import earnings_blackout

                blocked, why = earnings_blackout(symbol, days=1)
                if blocked:
                    reasons.append(why)
                    confidence = max(confidence, 0.85)
            except Exception as exc:
                logger.debug("earnings blackout check failed: %s", exc)

        active = bool(reasons) and confidence >= settings.risk.veto_confidence_floor
        reason = "; ".join(reasons) if reasons else "No hard risk breach detected"
        return RiskVeto(
            active=active,
            reason=reason,
            confidence=min(confidence, 0.95),
            blocked_actions=[Action.BUY, Action.ADD],
            metrics=metrics,
        )
