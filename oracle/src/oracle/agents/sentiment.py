"""Sentiment Agent — news headline polarity (deterministic lexicon MVP).

Phase 2: Reddit / X / Stocktwits APIs. Until then we refuse to invent social buzz.
"""

from __future__ import annotations

import logging
import re

from oracle.agents.base import opinion
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.news import fetch_symbol_news

logger = logging.getLogger("oracle.agents.sentiment")

BULLISH = {
    "beat",
    "beats",
    "surge",
    "rally",
    "rallies",
    "upgrade",
    "upgrades",
    "record",
    "growth",
    "bullish",
    "outperform",
    "strong",
    "soar",
    "soars",
    "optimistic",
}
BEARISH = {
    "miss",
    "misses",
    "cut",
    "cuts",
    "downgrade",
    "downgrades",
    "lawsuit",
    "probe",
    "fraud",
    "recession",
    "crash",
    "fear",
    "panic",
    "weak",
    "slump",
    "bearish",
    "war",
    "sanction",
    "bankruptcy",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", text.lower())


class SentimentAgent:
    name = AgentName.SENTIMENT.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        headlines = fetch_symbol_news(symbol, limit=12)
        evidence: list[Evidence] = []

        if not headlines:
            return opinion(
                AgentName.SENTIMENT,
                symbol,
                0.0,
                0.3,
                "No recent headlines available; social feeds not connected in MVP. Neutral.",
                [
                    Evidence(
                        claim="Empty news set; social APIs deferred to Phase 2",
                        source="oracle.sentiment",
                        metric="coverage",
                        value=0,
                    )
                ],
                held,
                metadata={"phase2": ["reddit", "x", "stocktwits"]},
            )

        bull = bear = 0
        for h in headlines:
            tokens = set(_tokenize(h.title))
            b = len(tokens & BULLISH)
            s = len(tokens & BEARISH)
            bull += b
            bear += s
            evidence.append(
                Evidence(
                    claim=h.title,
                    metric="headline",
                    value=f"bull_hits={b},bear_hits={s}",
                    source=h.link or "yfinance.news",
                )
            )

        total = bull + bear
        if total == 0:
            score = 0.0
            extreme = False
        else:
            score = (bull - bear) / total
            extreme = abs(score) >= 0.7 and total >= 4

        # Extreme optimism/fear flag — fade extremes slightly in score metadata
        if extreme and score > 0:
            adj = score * 0.7  # crowded optimism → less bullish confidence in actionability
            note = "Excess optimism detected — treat breakouts cautiously."
        elif extreme and score < 0:
            adj = score * 0.7
            note = "Excess fear detected — forced selling risk; not an automatic buy."
        else:
            adj = score * 0.5  # headlines are noisy
            note = "Sentiment within normal range."

        conf = min(0.7, 0.35 + 0.05 * min(len(headlines), 8) + (0.1 if total >= 3 else 0))
        summary = (
            f"Headline lexicon sentiment for {symbol}: bull_hits={bull}, bear_hits={bear}. {note} "
            "Lexicon methods are coarse; not a substitute for primary research."
        )
        return opinion(
            AgentName.SENTIMENT,
            symbol,
            adj,
            conf,
            summary,
            evidence[:8],
            held,
            metadata={
                "bull_hits": bull,
                "bear_hits": bear,
                "extreme": extreme,
                "headline_count": len(headlines),
            },
        )
