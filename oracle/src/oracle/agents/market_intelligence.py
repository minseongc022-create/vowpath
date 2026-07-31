"""Market Intelligence Agent — macro / news / calendar / filings / index regime."""

from __future__ import annotations

import logging

from oracle.agents.base import opinion
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.calendar import events_for_symbol
from oracle.data.macro import fetch_macro_snapshot
from oracle.data.market import index_overview
from oracle.data.news import aggregate_market_headlines
from oracle.data.sec import filing_hints

logger = logging.getLogger("oracle.agents.market_intelligence")


class MarketIntelligenceAgent:
    name = AgentName.MARKET_INTELLIGENCE.value

    def __init__(self, watchlist: list[str] | None = None) -> None:
        self.watchlist = watchlist or ["SPY", "QQQ", "IWM", "TLT", "GLD", "^VIX"]

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        overview = index_overview(self.watchlist)
        headlines = aggregate_market_headlines([symbol, "SPY"], per_symbol=4)
        macro = fetch_macro_snapshot()
        events = events_for_symbol(symbol, days=14)
        filings = filing_hints(symbol, limit=4)

        evidence: list[Evidence] = []
        score_parts: list[float] = []

        spy = overview.get("SPY")
        if spy is not None:
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

        if "vix" in macro.levels:
            lvl = macro.levels["vix"]
            if lvl >= 25:
                score_parts.append(-0.35)
            evidence.append(
                Evidence(
                    claim=f"VIX level {lvl:.1f}",
                    metric="vix_level",
                    value=lvl,
                    source="macro",
                )
            )

        if "us_10y" in macro.day_change_pct:
            ychg = macro.day_change_pct["us_10y"]
            score_parts.append(max(-1.0, min(1.0, -ychg / 5.0)) * 0.4)
            evidence.append(
                Evidence(
                    claim=f"10Y yield day change {ychg:+.2f}%",
                    metric="us10y_chg",
                    value=ychg,
                    source="macro",
                )
            )

        for note in macro.notes[:3]:
            evidence.append(
                Evidence(claim=note, metric="macro_note", value=None, source="macro")
            )

        for ev in events[:3]:
            evidence.append(
                Evidence(
                    claim=f"{ev.date}: {ev.title} [{ev.importance}]",
                    metric="calendar",
                    value=ev.category,
                    source="calendar.yaml",
                )
            )
            if ev.importance == "high" and ev.category in {"fomc", "cpi"}:
                score_parts.append(-0.1)  # event risk → slightly defensive

        for f in filings[:3]:
            evidence.append(
                Evidence(
                    claim=f.title,
                    metric=f.kind,
                    value=None,
                    source=f.link or "sec/news",
                )
            )

        for h in headlines[:4]:
            evidence.append(
                Evidence(
                    claim=h.title,
                    metric="headline",
                    value=h.publisher,
                    source=h.link or "yfinance.news",
                )
            )

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
        conf = 0.4 + 0.08 * min(len(score_parts), 5)
        summary = (
            f"Market intelligence for {symbol}: indices={overview}; "
            f"macro_notes={len(macro.notes)}; events={len(events)}. Probabilistic only."
        )
        return opinion(
            AgentName.MARKET_INTELLIGENCE,
            symbol,
            score,
            min(conf, 0.78),
            summary,
            evidence,
            held,
            metadata={
                "overview": overview,
                "macro": {
                    "levels": macro.levels,
                    "fred": macro.fred,
                    "notes": macro.notes,
                },
                "events": [e.title for e in events],
            },
        )
