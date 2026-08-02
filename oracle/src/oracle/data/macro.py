"""Macro / rates / FX / commodities — yfinance proxies + optional FRED."""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from datetime import UTC
from typing import Any

import yfinance as yf

logger = logging.getLogger("oracle.data.macro")

# Free proxies (no API key). FRED series override when FRED_API_KEY is set.
MACRO_TICKERS = {
    "us_10y": "^TNX",          # 10Y yield *10 style quote
    "us_2y": "^IRX",           # 13-week bill as short-rate proxy
    "dxy": "DX-Y.NYB",         # Dollar index
    "eurusd": "EURUSD=X",
    "usdjpy": "JPY=X",
    "wti": "CL=F",
    "gold": "GC=F",
    "copper": "HG=F",
    "vix": "^VIX",
    "hy_spread_proxy": "HYG",  # risk appetite via HY ETF (inverse of stress when rising)
}

FRED_SERIES = {
    "fed_funds": "FEDFUNDS",
    "cpi": "CPIAUCSL",
    "unemployment": "UNRATE",
    "treasury_10y": "DGS10",
    "treasury_2y": "DGS2",
}


@dataclass
class MacroSnapshot:
    as_of: str
    levels: dict[str, float] = field(default_factory=dict)
    day_change_pct: dict[str, float] = field(default_factory=dict)
    fred: dict[str, float] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)


def _yf_last_two(symbol: str) -> tuple[float, float] | None:
    try:
        hist = yf.Ticker(symbol).history(period="10d", auto_adjust=True)
        if hist is None or len(hist) < 2:
            return None
        close = hist["Close"]
        return float(close.iloc[-1]), float(close.iloc[-2])
    except Exception as exc:
        logger.debug("macro fetch failed %s: %s", symbol, exc)
        return None


def fetch_fred_latest() -> dict[str, float]:
    key = os.getenv("FRED_API_KEY", "").strip()
    if not key:
        return {}
    out: dict[str, float] = {}
    try:
        import httpx
    except ImportError:
        return {}
    for name, series_id in FRED_SERIES.items():
        try:
            url = "https://api.stlouisfed.org/fred/series/observations"
            params = {
                "series_id": series_id,
                "api_key": key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": 5,
            }
            r = httpx.get(url, params=params, timeout=20.0)
            r.raise_for_status()
            obs = r.json().get("observations") or []
            for row in obs:
                val = row.get("value")
                if val not in (None, "."):
                    out[name] = float(val)
                    break
        except Exception as exc:
            logger.warning("FRED %s failed: %s", series_id, exc)
    return out


def fetch_macro_snapshot() -> MacroSnapshot:
    from datetime import datetime

    levels: dict[str, float] = {}
    chg: dict[str, float] = {}
    notes: list[str] = []
    for name, ticker in MACRO_TICKERS.items():
        pair = _yf_last_two(ticker)
        if not pair:
            continue
        last, prev = pair
        levels[name] = last
        if prev:
            chg[name] = (last - prev) / prev * 100.0

    # Regime notes (deterministic rules)
    if "vix" in levels:
        v = levels["vix"]
        if v >= 30:
            notes.append(f"VIX elevated at {v:.1f} — risk-off bias")
        elif v <= 15:
            notes.append(f"VIX subdued at {v:.1f} — complacency risk")
    if "us_10y" in chg and abs(chg["us_10y"]) > 2:
        notes.append(f"10Y yield day move {chg['us_10y']:+.2f}% — rates volatility")
    if "dxy" in chg and chg["dxy"] > 0.5:
        notes.append("USD firming (DXY up) — pressure on risk assets / EM")

    fred = fetch_fred_latest()
    if not fred:
        notes.append("FRED_API_KEY not set — using market proxies only")

    return MacroSnapshot(
        as_of=datetime.now(UTC).isoformat(),
        levels=levels,
        day_change_pct=chg,
        fred=fred,
        notes=notes,
    )


def macro_as_dict(snap: MacroSnapshot | None = None) -> dict[str, Any]:
    snap = snap or fetch_macro_snapshot()
    return {
        "as_of": snap.as_of,
        "levels": snap.levels,
        "day_change_pct": snap.day_change_pct,
        "fred": snap.fred,
        "notes": snap.notes,
    }
