"""Market regime from FACT levels (not vibes).

Important: index_overview() returns day *percent change* for ^VIX.
Regime risk_on/off must use the VIX *level* from macro (e.g. 14 vs 28).
"""

from __future__ import annotations

import logging

from oracle.data.macro import fetch_macro_snapshot
from oracle.data.market import index_overview

logger = logging.getLogger("oracle.data.regime")


def build_regime(overview: dict | None = None) -> dict:
    """Return regime pack with accurate VIX level + index day moves."""
    overview = overview if overview is not None else index_overview()
    spy = float(overview.get("SPY") or 0.0)
    qqq = float(overview.get("QQQ") or 0.0)
    vix_day = float(overview.get("^VIX") or overview.get("VIX") or 0.0)

    vix_level = 0.0
    try:
        macro = fetch_macro_snapshot()
        vix_level = float((macro.levels or {}).get("vix") or 0.0)
    except Exception:
        logger.debug("macro VIX level unavailable", exc_info=True)

    # Fallback: if overview somehow has a level-like value (>=8), treat as level
    if vix_level <= 0 and abs(vix_day) >= 8:
        vix_level = abs(vix_day)

    risk_off = (vix_level >= 22) or (spy <= -1.2 and qqq <= -1.2)
    risk_on = (0 < vix_level <= 16) and spy >= 0.3
    if risk_off:
        label = "risk_off"
    elif risk_on:
        label = "risk_on"
    else:
        label = "neutral"

    return {
        "label": label,
        "spy_day": spy,
        "qqq_day": qqq,
        "vix": round(vix_level, 2) if vix_level else vix_day,
        "vix_level": round(vix_level, 2),
        "vix_day_pct": vix_day,
        "risk_off": bool(risk_off),
        "risk_on": bool(risk_on),
    }
