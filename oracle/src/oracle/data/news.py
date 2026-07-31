"""News / macro headlines — MVP uses Yahoo RSS-style search via yfinance news.

Phase 2: NewsAPI, FRED, SEC EDGAR, geopolitical feeds.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

import yfinance as yf

logger = logging.getLogger("oracle.data.news")


@dataclass
class Headline:
    title: str
    publisher: str | None
    link: str | None
    published_at: datetime | None
    symbol: str | None = None


def fetch_symbol_news(symbol: str, limit: int = 8) -> list[Headline]:
    headlines: list[Headline] = []
    try:
        items = yf.Ticker(symbol).news or []
    except Exception as exc:
        logger.warning("news fetch failed for %s: %s", symbol, exc)
        return headlines

    for item in items[:limit]:
        # yfinance news schema varies by version
        content = item.get("content") if isinstance(item.get("content"), dict) else None
        if content:
            title = content.get("title") or ""
            publisher = (content.get("provider") or {}).get("displayName")
            link = (content.get("canonicalUrl") or {}).get("url")
            pub = content.get("pubDate")
        else:
            title = item.get("title") or ""
            publisher = item.get("publisher")
            link = item.get("link")
            pub = item.get("providerPublishTime")

        published_at = None
        if isinstance(pub, (int, float)):
            published_at = datetime.fromtimestamp(pub, tz=UTC)
        elif isinstance(pub, str):
            try:
                published_at = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            except ValueError:
                published_at = None

        if title:
            headlines.append(
                Headline(
                    title=title,
                    publisher=publisher,
                    link=link,
                    published_at=published_at,
                    symbol=symbol,
                )
            )
    return headlines


def aggregate_market_headlines(symbols: list[str], per_symbol: int = 3) -> list[Headline]:
    seen: set[str] = set()
    out: list[Headline] = []
    for s in symbols:
        for h in fetch_symbol_news(s, limit=per_symbol):
            key = h.title.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(h)
    return out
