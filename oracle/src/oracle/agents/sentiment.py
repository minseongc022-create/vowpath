"""Sentiment Agent — headlines + Stocktwits + optional Reddit."""

from __future__ import annotations

import logging
import re

from oracle.agents.base import opinion
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.news import fetch_symbol_news
from oracle.data.social import social_sentiment_score

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
        parts: list[float] = []

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
        if total:
            headline_score = (bull - bear) / total
            parts.append(headline_score * 0.45)
            evidence.append(
                Evidence(
                    claim=f"Headline lexicon bull={bull} bear={bear}",
                    metric="headline_tilt",
                    value=headline_score,
                    source="oracle.sentiment",
                )
            )

        social_score, social_meta = social_sentiment_score(symbol)
        if social_meta.get("coverage", 0) > 0:
            adj = social_score * 0.5
            if social_meta.get("extreme"):
                adj *= 0.7
                note = "Extreme social crowd — fade confidence."
            else:
                note = "Social coverage present."
            parts.append(adj)
            evidence.append(
                Evidence(
                    claim=f"Social score={social_score:+.2f} ({note})",
                    metric="social_score",
                    value=social_score,
                    source="stocktwits+reddit",
                )
            )
        else:
            evidence.append(
                Evidence(
                    claim="No social coverage (Stocktwits empty / Reddit creds missing)",
                    metric="social_coverage",
                    value=0,
                    source="oracle.sentiment",
                )
            )

        if not parts:
            return opinion(
                AgentName.SENTIMENT,
                symbol,
                0.0,
                0.3,
                "No sentiment inputs — neutral.",
                evidence,
                held,
                metadata={"phase": "news+social"},
            )

        score = sum(parts) / len(parts)
        conf = min(
            0.75,
            0.35
            + 0.04 * min(len(headlines), 8)
            + 0.02 * min(int(social_meta.get("coverage", 0)), 10),
        )
        summary = (
            f"Sentiment for {symbol}: headline_tilt + social. "
            f"score={score:+.2f}. Lexicon/social methods are noisy — not certainty."
        )
        return opinion(
            AgentName.SENTIMENT,
            symbol,
            score,
            conf,
            summary,
            evidence[:10],
            held,
            metadata={"bull_hits": bull, "bear_hits": bear, "social": social_meta},
        )
