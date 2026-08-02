"""Earnings blackout — YAML calendar + yfinance dates (best-effort facts)."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from functools import lru_cache

from oracle.data.calendar import events_for_symbol

logger = logging.getLogger("oracle.data.earnings")


@lru_cache(maxsize=128)
def _yf_next_earnings(symbol: str) -> date | None:
    try:
        import yfinance as yf

        t = yf.Ticker(symbol)
        # Prefer get_earnings_dates when available
        if hasattr(t, "get_earnings_dates"):
            try:
                df = t.get_earnings_dates(limit=4)
                if df is not None and len(df) > 0:
                    today = date.today()
                    for idx in df.index:
                        try:
                            d = idx.date() if hasattr(idx, "date") else date.fromisoformat(str(idx)[:10])
                        except Exception:
                            continue
                        if d >= today - timedelta(days=1):
                            return d
            except Exception:
                pass
        cal = getattr(t, "calendar", None)
        if isinstance(cal, dict):
            raw = cal.get("Earnings Date") or cal.get("earningsDate")
            if isinstance(raw, (list, tuple)) and raw:
                raw = raw[0]
            if hasattr(raw, "date"):
                return raw.date()
            if isinstance(raw, datetime):
                return raw.date()
            if isinstance(raw, str) and len(raw) >= 10:
                return date.fromisoformat(raw[:10])
    except Exception as exc:
        logger.debug("earnings lookup failed %s: %s", symbol, exc)
    return None


def earnings_blackout(symbol: str, *, days: int = 1) -> tuple[bool, str]:
    """True if new risk should be avoided around earnings (±days)."""
    sym = symbol.upper()
    today = date.today()
    # YAML facts first (operator-maintained)
    for e in events_for_symbol(sym, days=max(days, 7)):
        if e.category != "earnings":
            continue
        if abs((e.date - today).days) <= days:
            return True, f"실적 블랙아웃 · YAML {e.date.isoformat()} · {e.title}"
    ed = _yf_next_earnings(sym)
    if ed is not None and abs((ed - today).days) <= days:
        return True, f"실적 블랙아웃 · {ed.isoformat()} (yfinance)"
    return False, ""


def clear_earnings_cache() -> None:
    _yf_next_earnings.cache_clear()
