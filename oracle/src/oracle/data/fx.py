"""USD/KRW FX helpers for dashboard display."""

from __future__ import annotations

import logging
from functools import lru_cache

logger = logging.getLogger("oracle.data.fx")

# Fallback if market data unavailable (approx)
_FALLBACK_USDKRW = 1380.0


@lru_cache(maxsize=1)
def _fetch_usdkrw_uncached(bucket: int) -> float:
    """bucket = unix // 300 so cache refreshes ~every 5 minutes per process."""
    del bucket  # only used as cache key
    try:
        import yfinance as yf

        hist = yf.Ticker("USDKRW=X").history(period="5d")
        if hist is not None and not hist.empty and "Close" in hist.columns:
            val = float(hist["Close"].dropna().iloc[-1])
            if 500 < val < 3000:
                return round(val, 2)
    except Exception:
        logger.debug("USDKRW fetch failed", exc_info=True)
    return _FALLBACK_USDKRW


def usd_krw_rate() -> float:
    import time

    return _fetch_usdkrw_uncached(int(time.time()) // 300)


def fx_snapshot() -> dict:
    rate = usd_krw_rate()
    return {
        "pair": "USD/KRW",
        "usdkrw": rate,
        "label_ko": f"1달러 = {rate:,.0f}원",
        "source": "yahoo",
    }
