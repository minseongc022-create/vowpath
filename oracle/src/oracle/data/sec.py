"""SEC / filing awareness via yfinance + optional EDGAR search links."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import yfinance as yf

logger = logging.getLogger("oracle.data.sec")


@dataclass
class FilingHint:
    symbol: str
    title: str
    kind: str  # earnings | filing | other
    link: str | None = None


def filing_hints(symbol: str, limit: int = 6) -> list[FilingHint]:
    """Best-effort: scan Yahoo news for filing/earnings language."""
    hints: list[FilingHint] = []
    try:
        items = yf.Ticker(symbol).news or []
    except Exception as exc:
        logger.debug("sec/news failed %s: %s", symbol, exc)
        return hints

    keys_filing = ("8-k", "10-k", "10-q", "sec", "filing", "form 4")
    keys_earn = ("earnings", "eps", "guidance", "results")
    for item in items[:20]:
        content = item.get("content") if isinstance(item.get("content"), dict) else None
        if content:
            title = (content.get("title") or "").strip()
            link = (content.get("canonicalUrl") or {}).get("url")
        else:
            title = (item.get("title") or "").strip()
            link = item.get("link")
        low = title.lower()
        if any(k in low for k in keys_filing):
            kind = "filing"
        elif any(k in low for k in keys_earn):
            kind = "earnings"
        else:
            continue
        hints.append(FilingHint(symbol=symbol, title=title, kind=kind, link=link))
        if len(hints) >= limit:
            break

    # Always expose EDGAR search deep-link for operator follow-up
    hints.append(
        FilingHint(
            symbol=symbol,
            title=f"EDGAR company search for {symbol}",
            kind="filing",
            link=f"https://www.sec.gov/edgar/search/#/entityName={symbol}",
        )
    )
    return hints
