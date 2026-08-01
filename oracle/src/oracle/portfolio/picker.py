"""Smart stock picker — rank universe for buys, holdings for sells.

Uses fast market facts (momentum, relative strength vs SPY, short-term return)
plus full OraclePipeline decisions for final shortlist.
Free / local — no paid APIs required.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from oracle.config import get_settings
from oracle.core.types import Action, DecisionResult
from oracle.data.market import cached_history, fetch_snapshot
from oracle.portfolio.store import load_portfolio

logger = logging.getLogger("oracle.picker")


@dataclass
class PickScore:
    symbol: str
    screen_score: float
    mom_20: float
    rs_spy: float
    vol: float
    reasons: list[str]


def _safe_mom(symbol: str, window: int = 20) -> tuple[float, float]:
    try:
        df = cached_history(symbol, days=90)
        close = df["close"].dropna()
        if len(close) < window + 2:
            return 0.0, 0.25
        ret = float(close.iloc[-1] / close.iloc[-window] - 1.0)
        vol = float(close.pct_change().dropna().tail(20).std() * np.sqrt(252))
        return ret, max(vol, 0.05)
    except Exception:
        return 0.0, 0.25


def screen_universe(symbols: list[str] | None = None, limit: int = 8) -> list[PickScore]:
    """Rank liquid universe by momentum + RS vs SPY, vol-penalized."""
    settings = get_settings()
    symbols = list(dict.fromkeys(symbols or settings.symbols))
    spy_m, _ = _safe_mom("SPY", 20)
    picks: list[PickScore] = []
    for sym in symbols:
        if sym.upper() == "SPY":
            # keep SPY as possible hedge/benchmark trade but lower priority
            pass
        mom, vol = _safe_mom(sym, 20)
        rs = mom - spy_m
        # vol-adjusted momentum (Sharpe-ish short)
        adj = mom / max(vol, 0.08)
        score = 0.55 * mom + 0.35 * rs + 0.10 * np.tanh(adj)
        reasons = [
            f"20d모멘텀 {mom:+.1%}",
            f"SPY대비 {rs:+.1%}",
            f"변동성 {vol:.0%}",
        ]
        picks.append(PickScore(sym, float(score), mom, rs, vol, reasons))
    picks.sort(key=lambda p: p.screen_score, reverse=True)
    return picks[:limit]


def rank_decisions_for_trade(
    decisions: list[DecisionResult],
    *,
    held: set[str],
) -> tuple[DecisionResult | None, DecisionResult | None]:
    """Return (best_buy, best_sell) from AI decisions + screen boost."""
    screen = {p.symbol: p for p in screen_universe()}
    buy_cands: list[tuple[float, DecisionResult]] = []
    sell_cands: list[tuple[float, DecisionResult]] = []

    for d in decisions:
        if d.risk_veto and d.risk_veto.active and d.action in (Action.BUY, Action.ADD):
            continue
        if d.confidence < 0.36:
            continue
        sc = screen.get(d.symbol)
        boost = sc.screen_score if sc else 0.0
        edge = d.composite_score * d.confidence

        if d.action in (Action.BUY, Action.ADD) or (d.composite_score > 0.22 and d.confidence >= 0.45):
            if d.risk_veto and d.risk_veto.active:
                continue
            # prefer not already oversized holdings
            rank = edge + 0.35 * boost + (0.05 if d.symbol not in held else 0.0)
            # synthesize buy action if score strong but draft was hold
            buy_cands.append((rank, d))

        if d.symbol in held and (
            d.action in (Action.REDUCE, Action.SELL)
            or d.composite_score < -0.18
        ):
            rank = (-edge) + (0.2 if (sc and sc.screen_score < 0) else 0.0)
            sell_cands.append((rank, d))

    buy_cands.sort(key=lambda x: x[0], reverse=True)
    sell_cands.sort(key=lambda x: x[0], reverse=True)

    best_buy = buy_cands[0][1] if buy_cands else None
    best_sell = sell_cands[0][1] if sell_cands else None

    # If buy draft wasn't Buy/Add but score is strong, coerce action for execution layer
    if best_buy and best_buy.action not in (Action.BUY, Action.ADD):
        if best_buy.composite_score >= 0.22 and not (best_buy.risk_veto and best_buy.risk_veto.active):
            best_buy = best_buy.model_copy(
                update={
                    "action": Action.ADD if best_buy.symbol in held else Action.BUY,
                    "rationale": best_buy.rationale
                    + "\n[PICKER] Strong screen+AI edge → promote to buy.",
                }
            )
    if best_sell and best_sell.action not in (Action.REDUCE, Action.SELL):
        if best_sell.composite_score <= -0.18:
            best_sell = best_sell.model_copy(
                update={
                    "action": Action.SELL if best_sell.composite_score <= -0.4 else Action.REDUCE,
                    "rationale": best_sell.rationale
                    + "\n[PICKER] Weak holding → promote to reduce/sell.",
                }
            )

    return best_buy, best_sell


def top_picks_summary(limit: int = 5) -> list[dict]:
    out = []
    for p in screen_universe(limit=limit):
        try:
            px = float(fetch_snapshot(p.symbol).price)
        except Exception:
            px = 0.0
        out.append(
            {
                "symbol": p.symbol,
                "screen_score": round(p.screen_score, 3),
                "mom_20": round(p.mom_20, 4),
                "rs_spy": round(p.rs_spy, 4),
                "price": px,
                "reasons": p.reasons,
            }
        )
    return out
