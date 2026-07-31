"""Market Intelligence Agent — macro / news / index regime summary."""

from __future__ import annotations

import logging

from oracle.agents.base import opinion
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.market import index_overview
from oracle.data.news import aggregate_market_headlines

logger = logging.getLogger("oracle.agents.market_intelligence")


class MarketIntelligenceAgent:
    name = AgentName.MARKET_INTELLIGENCE.value

    def __init__(self, watchlist: list[str] | None = None) -> None:
        self.watchlist = watchlist or ["SPY", "QQQ", "IWM", "TLT", "GLD", "^VIX"]

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        overview = index_overview(self.watchlist)
        headlines = aggregate_market_headlines([symbol, "SPY"], per_symbol=4)

        evidence: list[Evidence] = []
        score_parts: list[float] = []

        spy = overview.get("SPY")
        if spy is not None:
            # daily move scaled softly into [-1, 1]
            part = max(-1.0, min(1.0, spy / 2.0))
            score_parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"SPY day change {spy:.2f}%",
                    metric="spy_day_pct",
                    value=spy,
                    source="yfinance",
                )
            )

        vix = overview.get("^VIX")
        if vix is not None:
            # rising VIX is risk-off
            part = max(-1.0, min(1.0, -vix / 5.0))
            score_parts.append(part)
            evidence.append(
                Evidence(
                    claim=f"VIX day change {vix:.2f}%",
                    metric="vix_day_pct",
                    value=vix,
                    source="yfinance",
                )
            )

        tlt = overview.get("TLT")
        if tlt is not None and spy is not None:
            # risk-on if equities up and bonds not strongly bid
            part = max(-1.0, min(1.0, (spy - tlt) / 3.0))
            score_parts.append(part * 0.5)
            evidence.append(
                Evidence(
                    claim=f"Equity-bond day spread SPY-TLT={spy - tlt:.2f}pp",
                    metric="spy_tlt_spread",
                    value=spy - tlt,
                    source="yfinance",
                )
            )

        for h in headlines[:5]:
            evidence.append(
                Evidence(
                    claim=h.title,
                    metric="headline",
                    value=h.publisher,
                    source=h.link or "yfinance.news",
                )
            )

        # Keyword tilt from headlines (deterministic, not LLM "gut feel")
        bullish_kw = ("beat", "surge", "rally", "upgrade", "growth", "record")
        bearish_kw = ("miss", "cut", "downgrade", "lawsuit", "probe", "recession", "war")
        text = " ".join(h.title.lower() for h in headlines)
        hits_b = sum(1 for k in bullish_kw if k in text)
        hits_s = sum(1 for k in bearish_kw if k in text)
        if hits_b or hits_s:
            part = max(-1.0, min(1.0, (hits_b - hits_s) / 3.0))
            score_parts.append(part * 0.4)
            evidence.append(
                Evidence(
                    claim=f"Headline keyword tilt bull={hits_b} bear={hits_s}",
                    metric="headline_tilt",
                    value=part,
                    source="oracle.keyword_rules",
                )
            )

        score = sum(score_parts) / len(score_parts) if score_parts else 0.0
        conf = 0.4 + 0.1 * min(len(score_parts), 4)
        summary = (
            f"Market regime signals for {symbol}: "
            f"indices={overview}; headline_count={len(headlines)}. "
            "Interpretation is probabilistic, not certain."
        )
        return opinion(
            AgentName.MARKET_INTELLIGENCE,
            symbol,
            score,
            min(conf, 0.75),
            summary,
            evidence,
            held,
            metadata={"overview": overview, "headline_count": len(headlines)},
        )
