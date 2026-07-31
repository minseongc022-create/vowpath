"""Fundamental data via yfinance info (best-effort, free)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import yfinance as yf

from oracle.core.exceptions import DataUnavailableError

logger = logging.getLogger("oracle.data.fundamentals")


@dataclass
class FundamentalSnapshot:
    symbol: str
    trailing_pe: float | None = None
    forward_pe: float | None = None
    peg_ratio: float | None = None
    profit_margins: float | None = None
    revenue_growth: float | None = None
    earnings_growth: float | None = None
    free_cashflow: float | None = None
    total_debt: float | None = None
    total_cash: float | None = None
    debt_to_equity: float | None = None
    return_on_equity: float | None = None
    market_cap: float | None = None
    sector: str | None = None
    industry: str | None = None
    raw: dict[str, Any] | None = None


def _f(info: dict[str, Any], key: str) -> float | None:
    val = info.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def fetch_fundamentals(symbol: str) -> FundamentalSnapshot:
    try:
        info = yf.Ticker(symbol).info or {}
    except Exception as exc:
        raise DataUnavailableError(f"Fundamentals unavailable for {symbol}: {exc}") from exc

    if not info or (info.get("quoteType") in (None,) and not info.get("regularMarketPrice")):
        # ETFs and some tickers still have partial info — allow thin payloads
        logger.info("Thin fundamental payload for %s", symbol)

    return FundamentalSnapshot(
        symbol=symbol,
        trailing_pe=_f(info, "trailingPE"),
        forward_pe=_f(info, "forwardPE"),
        peg_ratio=_f(info, "pegRatio"),
        profit_margins=_f(info, "profitMargins"),
        revenue_growth=_f(info, "revenueGrowth"),
        earnings_growth=_f(info, "earningsGrowth"),
        free_cashflow=_f(info, "freeCashflow"),
        total_debt=_f(info, "totalDebt"),
        total_cash=_f(info, "totalCash"),
        debt_to_equity=_f(info, "debtToEquity"),
        return_on_equity=_f(info, "returnOnEquity"),
        market_cap=_f(info, "marketCap"),
        sector=info.get("sector"),
        industry=info.get("industry"),
        raw=info,
    )
