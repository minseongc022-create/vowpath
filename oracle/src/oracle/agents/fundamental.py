"""Fundamental Analysis Agent — valuation, growth, leverage, cash."""

from __future__ import annotations

import logging

from oracle.agents.base import conf_from_agreement, opinion
from oracle.core.exceptions import DataUnavailableError
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.fundamentals import fetch_fundamentals

logger = logging.getLogger("oracle.agents.fundamental")


class FundamentalAnalysisAgent:
    name = AgentName.FUNDAMENTAL.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        evidence: list[Evidence] = []
        parts: list[float] = []

        try:
            f = fetch_fundamentals(symbol)
        except DataUnavailableError as exc:
            return opinion(
                AgentName.FUNDAMENTAL,
                symbol,
                0.0,
                0.2,
                f"Fundamentals unavailable: {exc}",
                [
                    Evidence(
                        claim="No fundamental data",
                        source="yfinance",
                        metric="availability",
                        value=0,
                    )
                ],
                held,
            )

        # ETFs / indices: thin fundamentals → neutral with low confidence
        if f.trailing_pe is None and f.revenue_growth is None and f.market_cap is None:
            return opinion(
                AgentName.FUNDAMENTAL,
                symbol,
                0.0,
                0.25,
                f"{symbol} appears to lack equity-style fundamentals (ETF/index?). Neutral.",
                [
                    Evidence(
                        claim="Sparse fundamental fields",
                        source="yfinance.info",
                        metric="coverage",
                        value=0,
                    )
                ],
                held,
                metadata={"sector": f.sector},
            )

        if f.trailing_pe is not None and f.trailing_pe > 0:
            # Soft preference for moderate PE (not value dogma)
            if f.trailing_pe < 15:
                part = 0.35
            elif f.trailing_pe < 25:
                part = 0.15
            elif f.trailing_pe < 40:
                part = -0.15
            else:
                part = -0.4
            parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"Trailing P/E {f.trailing_pe:.1f}",
                    metric="trailing_pe",
                    value=f.trailing_pe,
                    source="yfinance.info",
                )
            )

        if f.revenue_growth is not None:
            part = max(-1.0, min(1.0, f.revenue_growth * 2.0))
            parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"Revenue growth {f.revenue_growth:.1%}",
                    metric="revenue_growth",
                    value=f.revenue_growth,
                    source="yfinance.info",
                )
            )

        if f.profit_margins is not None:
            part = max(-1.0, min(1.0, (f.profit_margins - 0.1) * 3.0))
            parts.append(part * 0.7)
            evidence.append(
                Evidence(
                    claim=f"Profit margin {f.profit_margins:.1%}",
                    metric="profit_margins",
                    value=f.profit_margins,
                    source="yfinance.info",
                )
            )

        if f.debt_to_equity is not None:
            # high leverage → risk-off tilt
            dte = f.debt_to_equity
            # yfinance often reports D/E as percent-like (e.g. 150)
            norm = dte / 100.0 if dte > 10 else dte
            part = max(-1.0, min(1.0, (1.0 - norm) * 0.5))
            parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"Debt/Equity {dte:.1f}",
                    metric="debt_to_equity",
                    value=dte,
                    source="yfinance.info",
                )
            )

        if f.free_cashflow is not None and f.market_cap is not None and f.market_cap > 0:
            fcf_yield = f.free_cashflow / f.market_cap
            part = max(-1.0, min(1.0, fcf_yield * 8.0))
            parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"FCF yield {fcf_yield:.2%}",
                    metric="fcf_yield",
                    value=fcf_yield,
                    source="yfinance.info",
                )
            )

        if f.return_on_equity is not None:
            part = max(-1.0, min(1.0, (f.return_on_equity - 0.1) * 2.5))
            parts.append(part * 0.6)
            evidence.append(
                Evidence(
                    claim=f"ROE {f.return_on_equity:.1%}",
                    metric="roe",
                    value=f.return_on_equity,
                    source="yfinance.info",
                )
            )

        score = sum(parts) / len(parts) if parts else 0.0
        conf = conf_from_agreement(parts, base=0.4)
        summary = (
            f"Fundamental score for {symbol} based on {len(parts)} metrics "
            f"(sector={f.sector or 'n/a'}). Not a valuation guarantee."
        )
        return opinion(
            AgentName.FUNDAMENTAL,
            symbol,
            score,
            conf,
            summary,
            evidence,
            held,
            metadata={"sector": f.sector, "industry": f.industry},
        )
