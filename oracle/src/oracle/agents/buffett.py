"""Buffett Owner Agent — public owner principles scored on FACT fundamentals."""

from __future__ import annotations

import logging

from oracle.agents.base import opinion
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.investing.buffett import evaluate_buffett

logger = logging.getLogger("oracle.agents.buffett")


class BuffettOwnerAgent:
    name = AgentName.BUFFETT.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        verdict = evaluate_buffett(symbol)
        evidence: list[Evidence] = []
        for c in verdict.checks[:10]:
            evidence.append(
                Evidence(
                    claim=f"{c.title_ko}: {c.detail_ko}",
                    metric=c.principle_id,
                    value=c.score,
                    source="buffett_rules+yfinance",
                )
            )
        if not evidence:
            evidence.append(
                Evidence(
                    claim=verdict.summary_ko,
                    metric="buffett_score",
                    value=verdict.score,
                    source="buffett_rules",
                )
            )
        return opinion(
            AgentName.BUFFETT,
            symbol,
            verdict.score,
            verdict.confidence,
            verdict.summary_ko,
            evidence,
            held,
            metadata={
                "owner_quality": verdict.owner_quality,
                "margin_of_safety": verdict.margin_of_safety,
                "buy_ok": verdict.buy_ok,
                "principles_hit": verdict.principles_hit,
                "principles_fail": verdict.principles_fail,
            },
        )
