"""Market price data via yfinance + parquet disk cache."""

from __future__ import annotations

import logging
from datetime import UTC
from functools import lru_cache

import numpy as np
import pandas as pd
import yfinance as yf

from oracle.core.exceptions import DataUnavailableError
from oracle.core.types import MarketSnapshot
from oracle.data.cache import load_cached, save_cache

logger = logging.getLogger("oracle.data.market")


def _fetch_history_remote(symbol: str, days: int = 365) -> pd.DataFrame:
    period = f"{max(days, 30)}d"
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, auto_adjust=True)
    except Exception as exc:
        raise DataUnavailableError(f"Failed to fetch history for {symbol}: {exc}") from exc

    if df is None or df.empty:
        raise DataUnavailableError(f"No price history for {symbol}")

    df = df.rename(columns=str.lower)
    required = {"open", "high", "low", "close", "volume"}
    cols = {c.lower() for c in df.columns}
    missing = required - cols
    if missing:
        raise DataUnavailableError(f"{symbol} missing columns: {missing}")
    keep = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    return df[keep]


def fetch_history(symbol: str, days: int = 365, use_cache: bool = True) -> pd.DataFrame:
    """Return OHLCV history with DatetimeIndex. Raises if empty."""
    if use_cache:
        cached = load_cached(symbol)
        if cached is not None and len(cached) >= min(days, 40):
            return cached.tail(max(days, 30)) if len(cached) > days else cached
    df = _fetch_history_remote(symbol, days=days)
    if use_cache:
        save_cache(symbol, df)
    return df


def fetch_snapshot(symbol: str) -> MarketSnapshot:
    hist = fetch_history(symbol, days=10)
    close = float(hist["close"].iloc[-1])
    prev = float(hist["close"].iloc[-2]) if len(hist) > 1 else None
    change = ((close - prev) / prev) if prev else None
    volume = float(hist["volume"].iloc[-1]) if "volume" in hist.columns else None
    as_of = hist.index[-1].to_pydatetime()
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=UTC)
    return MarketSnapshot(
        symbol=symbol,
        price=close,
        previous_close=prev,
        change_pct=change,
        volume=volume,
        as_of=as_of,
    )


def returns_series(symbol: str, days: int = 365) -> pd.Series:
    hist = fetch_history(symbol, days=days)
    return hist["close"].pct_change().dropna()


def annualized_volatility(returns: pd.Series) -> float:
    if returns.empty:
        return 0.0
    return float(returns.std(ddof=1) * np.sqrt(252))


def max_drawdown(prices: pd.Series) -> float:
    if prices.empty:
        return 0.0
    cummax = prices.cummax()
    dd = (prices - cummax) / cummax
    return float(dd.min())


def correlation(a: str, b: str, days: int = 180) -> float:
    ra = returns_series(a, days=days)
    rb = returns_series(b, days=days)
    joined = pd.concat([ra, rb], axis=1, join="inner").dropna()
    if len(joined) < 20:
        return 0.0
    return float(joined.iloc[:, 0].corr(joined.iloc[:, 1]))


@lru_cache(maxsize=64)
def cached_history(symbol: str, days: int = 365) -> pd.DataFrame:
    """Process-local cache (also uses disk parquet via fetch_history)."""
    return fetch_history(symbol, days=days)


def clear_market_cache() -> None:
    cached_history.cache_clear()


def index_overview(symbols: list[str] | None = None) -> dict[str, float]:
    symbols = symbols or ["SPY", "QQQ", "IWM", "TLT", "GLD", "^VIX"]
    out: dict[str, float] = {}
    for s in symbols:
        try:
            snap = fetch_snapshot(s)
            if snap.change_pct is not None:
                out[s] = round(snap.change_pct * 100, 3)
        except DataUnavailableError:
            logger.warning("skip overview symbol %s", s)
    return out
