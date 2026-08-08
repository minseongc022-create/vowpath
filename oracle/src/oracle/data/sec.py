"""SEC EDGAR submissions adapter (free, User-Agent required)."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache

import httpx

logger = logging.getLogger("oracle.data.sec")

SEC_UA = os.getenv(
    "SEC_USER_AGENT",
    "ProjectOracle research bot contact@example.com",
)


@dataclass
class FilingHint:
    symbol: str
    title: str
    kind: str  # earnings | filing | other
    link: str | None = None
    filed_at: str | None = None
    form: str | None = None


@lru_cache(maxsize=1)
def _ticker_cik_map() -> dict[str, str]:
    url = "https://www.sec.gov/files/company_tickers.json"
    try:
        with httpx.Client(timeout=30.0, headers={"User-Agent": SEC_UA}) as client:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
        out: dict[str, str] = {}
        for row in data.values():
            ticker = str(row.get("ticker", "")).upper()
            cik = str(int(row.get("cik_str")))
            if ticker:
                out[ticker] = cik.zfill(10)
        return out
    except Exception as exc:
        logger.warning("SEC ticker map failed: %s", exc)
        return {}


def _submissions(cik: str) -> dict:
    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    with httpx.Client(timeout=30.0, headers={"User-Agent": SEC_UA}) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.json()


def filing_hints(symbol: str, limit: int = 8) -> list[FilingHint]:
    """Prefer real EDGAR recent filings; fall back to EDGAR search link."""
    symbol = symbol.upper()
    hints: list[FilingHint] = []
    cik_map = _ticker_cik_map()
    cik = cik_map.get(symbol)
    if cik:
        try:
            data = _submissions(cik)
            recent = data.get("filings", {}).get("recent", {})
            forms = recent.get("form") or []
            dates = recent.get("filingDate") or []
            accessions = recent.get("accessionNumber") or []
            primaries = recent.get("primaryDocument") or []
            for i, form in enumerate(forms[: max(limit * 3, 20)]):
                form_u = str(form).upper()
                if form_u not in {"8-K", "10-K", "10-Q", "4", "S-1", "13F-HR"} and not form_u.startswith("8-K"):
                    continue
                filed = dates[i] if i < len(dates) else None
                acc = (accessions[i] if i < len(accessions) else "").replace("-", "")
                doc = primaries[i] if i < len(primaries) else ""
                link = None
                if acc and doc:
                    link = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc}/{doc}"
                kind = "earnings" if form_u in {"10-K", "10-Q"} else "filing"
                hints.append(
                    FilingHint(
                        symbol=symbol,
                        title=f"SEC {form_u} filed {filed}",
                        kind=kind,
                        link=link,
                        filed_at=filed,
                        form=form_u,
                    )
                )
                if len(hints) >= limit:
                    break
        except Exception as exc:
            logger.warning("SEC submissions failed for %s: %s", symbol, exc)

    hints.append(
        FilingHint(
            symbol=symbol,
            title=f"EDGAR company search for {symbol}",
            kind="filing",
            link=f"https://www.sec.gov/edgar/search/#/entityName={symbol}",
        )
    )
    return hints
