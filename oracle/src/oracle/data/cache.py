"""Parquet OHLCV cache — avoid hammering Yahoo on every agent call."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd

from oracle.config import get_settings, resolve_path

logger = logging.getLogger("oracle.data.cache")


def _cache_dir() -> Path:
    settings = get_settings()
    path = resolve_path(Path(settings.data_dir) / "cache" / "ohlcv")
    # resolve_path may return non-existing cwd path — ensure mkdir works
    if not path.exists():
        path = Path(settings.data_dir) / "cache" / "ohlcv"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _cache_path(symbol: str) -> Path:
    safe = symbol.replace("^", "_").replace("/", "_").replace("=", "_")
    return _cache_dir() / f"{safe}.parquet"


def load_cached(symbol: str, max_age_hours: float = 6.0) -> pd.DataFrame | None:
    path = _cache_path(symbol)
    if not path.exists():
        return None
    age = datetime.now(UTC) - datetime.fromtimestamp(path.stat().st_mtime, tz=UTC)
    if age > timedelta(hours=max_age_hours):
        logger.debug("cache stale for %s age=%s", symbol, age)
        return None
    try:
        df = pd.read_parquet(path)
        if df.empty:
            return None
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)
        return df
    except Exception as exc:
        logger.warning("cache read failed %s: %s", symbol, exc)
        return None


def save_cache(symbol: str, df: pd.DataFrame) -> None:
    path = _cache_path(symbol)
    try:
        out = df.copy()
        out.to_parquet(path)
    except Exception as exc:
        logger.warning("cache write failed %s: %s", symbol, exc)


def clear_disk_cache() -> int:
    """Delete all parquet caches. Returns count removed."""
    d = _cache_dir()
    n = 0
    for p in d.glob("*.parquet"):
        p.unlink(missing_ok=True)
        n += 1
    return n
