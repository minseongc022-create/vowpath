"""Smart stock picker — screen full liquid universe for short + long edges.

Fast market facts (5d / 20d / 60d momentum, RS vs SPY), then shortlist for AI.
Free / local — no paid APIs required.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import yaml

from oracle.config import get_settings, resolve_path
from oracle.core.types import Action, DecisionResult
from oracle.data.market import cached_history, fetch_snapshot

logger = logging.getLogger("oracle.picker")


@dataclass
class PickScore:
    symbol: str
    screen_score: float
    mom_20: float
    rs_spy: float
    vol: float
    reasons: list[str] = field(default_factory=list)
    mom_5: float = 0.0
    mom_60: float = 0.0
    short_score: float = 0.0
    long_score: float = 0.0
    dip_score: float = 0.0  # buy-the-dip (단타 매수)
    rip_score: float = 0.0  # sell-the-rip (단타 매도)
    horizon: str = "swing"  # short | long | swing
    adv_dollar: float = 0.0  # 20d average dollar volume
    rvol: float = 1.0  # last vol / 20d avg vol
    gap_pct: float = 0.0
    tradeable: bool = True
    skip_reason: str = ""


def load_trade_universe() -> list[str]:
    """Full liquid scan list (settings + universe_liquid.yaml)."""
    settings = get_settings()
    syms = list(settings.symbols or [])
    path = resolve_path("config/universe_liquid.yaml")
    if path.exists():
        try:
            raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
            extra = [str(s).upper() for s in (raw.get("symbols") or [])]
            syms.extend(extra)
        except Exception:
            logger.exception("failed loading universe_liquid.yaml")
    # Always keep SPY for RS baseline
    syms = ["SPY", *[s for s in syms if s.upper() != "SPY"]]
    return list(dict.fromkeys(s.upper() for s in syms if s))


def _moms(symbol: str) -> tuple[float, float, float, float]:
    """Return mom_5, mom_20, mom_60, vol."""
    try:
        df = cached_history(symbol, days=180)
        close = df["close"].dropna()
        if len(close) < 25:
            return 0.0, 0.0, 0.0, 0.25

        def _ret(w: int) -> float:
            if len(close) < w + 2:
                return 0.0
            return float(close.iloc[-1] / close.iloc[-w] - 1.0)

        vol = float(close.pct_change().dropna().tail(20).std() * np.sqrt(252))
        return _ret(5), _ret(20), _ret(60), max(vol, 0.05)
    except Exception:
        return 0.0, 0.0, 0.0, 0.25


def _ohlcv_facts(sym: str) -> tuple[float, float, float, float, float]:
    """Return pullback, bounce, adv_dollar, rvol, gap_pct from OHLCV facts."""
    pullback = bounce = 0.0
    adv_dollar = 0.0
    rvol = 1.0
    gap_pct = 0.0
    try:
        df = cached_history(sym, days=120)
        close = df["close"].dropna()
        if len(close) >= 20:
            px = float(close.iloc[-1])
            hi20 = float(close.tail(20).max())
            lo20 = float(close.tail(20).min())
            pullback = px / hi20 - 1.0
            bounce = px / lo20 - 1.0
        if "volume" in df.columns and len(df) >= 21:
            dollar = (df["close"] * df["volume"]).dropna()
            if len(dollar) >= 20:
                adv_dollar = float(dollar.tail(20).mean())
            vol = df["volume"].dropna()
            v20 = float(vol.tail(20).mean()) if len(vol) >= 20 else 0.0
            vlast = float(vol.iloc[-1]) if len(vol) else 0.0
            rvol = (vlast / v20) if v20 > 0 else 1.0
        if "open" in df.columns and len(close) >= 2:
            prev = float(close.iloc[-2])
            op = float(df["open"].dropna().iloc[-1])
            if prev > 0:
                gap_pct = op / prev - 1.0
    except Exception:
        pass
    return pullback, bounce, adv_dollar, rvol, gap_pct


# Minimum 20d ADV$ for new entries (indexes exempt)
_MIN_ADV_DOLLAR = 25_000_000.0


def _score_symbol(sym: str, spy5: float, spy20: float, spy60: float) -> PickScore:
    m5, m20, m60, vol = _moms(sym)
    rs5, rs20, rs60 = m5 - spy5, m20 - spy20, m60 - spy60
    pullback, bounce, adv_dollar, rvol, gap_pct = _ohlcv_facts(sym)

    # 단타 BUY: 싸게(고점 대비 눌림) 담고, 반등 여지 있을 때
    dip = max(-pullback, 0.0) * 0.55 + max(-m5, 0.0) * 0.25 + max(rs20, -0.05) * 0.20
    if pullback > -0.012:  # 거의 안 빠졌으면 단타 매수 점수 낮춤
        dip *= 0.25
    # Chase filter: already extended / at highs → kill dip score
    if pullback > -0.008 and m5 > 0.04:
        dip *= 0.1
    # Relative volume confirms dip interest
    if rvol >= 1.2 and dip > 0:
        dip *= 1.15
    elif rvol < 0.7:
        dip *= 0.65
    # 단타 SELL: 올랐을 때(고점 근접·5일 급등) 빼기
    rip = max(m5, 0.0) * 0.45 + max(pullback + 0.01, 0.0) * 0.35 + max(bounce - 0.06, 0.0) * 0.20

    mom_short = (0.55 * m5 + 0.30 * rs5 + 0.15 * m20) / max(vol / 0.25, 0.7)
    short = 0.75 * dip + 0.25 * max(mom_short, 0.0)
    long = 0.55 * m60 + 0.25 * rs60 + 0.20 * m20
    long = long / max(vol / 0.22, 0.75)
    # Don't promote "long" that is already pinned to 20d highs
    if pullback > -0.01:
        long *= 0.45
    blend = 0.50 * short + 0.50 * long
    if dip >= 0.025 or (short > 0.02 and dip > long):
        horizon = "short"
    elif long > 0.03:
        horizon = "long"
    else:
        horizon = "swing"

    tradeable = True
    skip_reason = ""
    if sym.upper() not in {"SPY", "QQQ", "IWM", "DIA"} and adv_dollar > 0:
        if adv_dollar < _MIN_ADV_DOLLAR:
            tradeable = False
            skip_reason = f"유동성부족 ADV${adv_dollar/1e6:.1f}M<{_MIN_ADV_DOLLAR/1e6:.0f}M"
            short = dip = blend = -1.0
            long = min(long, 0.0)

    reasons = [
        f"눌림(고점대비) {pullback:+.1%}",
        f"단타매수점수 {dip:.2f}",
        f"단타매도점수 {rip:.2f}",
        f"5일 {m5:+.1%} · 60일 {m60:+.1%}",
        f"RVOL {rvol:.2f} · ADV ${adv_dollar/1e6:.0f}M" if adv_dollar else f"RVOL {rvol:.2f}",
        f"갭 {gap_pct:+.1%}",
        f"성향 {('단타' if horizon=='short' else '장타' if horizon=='long' else '스윙')}",
    ]
    if skip_reason:
        reasons.insert(0, skip_reason)
    return PickScore(
        symbol=sym,
        screen_score=float(blend),
        mom_20=m20,
        rs_spy=rs20,
        vol=vol,
        reasons=reasons,
        mom_5=m5,
        mom_60=m60,
        short_score=float(short),
        long_score=float(long),
        dip_score=float(dip),
        rip_score=float(rip),
        horizon=horizon,
        adv_dollar=float(adv_dollar),
        rvol=float(rvol),
        gap_pct=float(gap_pct),
        tradeable=tradeable,
        skip_reason=skip_reason,
    )


def screen_universe(
    symbols: list[str] | None = None,
    limit: int = 12,
    *,
    on_progress=None,
) -> list[PickScore]:
    """Rank full liquid universe; return top `limit` by blended score."""
    symbols = list(dict.fromkeys(symbols or load_trade_universe()))
    n = len(symbols)
    if on_progress:
        on_progress(f"전 유니버스 {n}종목 스캔 중 (단타·장타)…")
    spy5, spy20, spy60, _ = _moms("SPY")
    picks: list[PickScore] = []
    for i, sym in enumerate(symbols, 1):
        picks.append(_score_symbol(sym, spy5, spy20, spy60))
        if on_progress and (i % 25 == 0 or i == n):
            on_progress(f"스크리닝 {i}/{n}…")
    picks.sort(key=lambda p: p.screen_score, reverse=True)
    return picks[:limit]


def screen_short_and_long(
    *,
    limit_short: int = 5,
    limit_long: int = 5,
    on_progress=None,
) -> tuple[list[PickScore], list[PickScore], list[PickScore]]:
    """Return (top_short, top_long, top_blended)."""
    symbols = load_trade_universe()
    n = len(symbols)
    if on_progress:
        on_progress(f"① 전 종목 탐색 · {n}개 (단타+장타 동시)")
    spy5, spy20, spy60, _ = _moms("SPY")
    all_picks: list[PickScore] = []
    for i, sym in enumerate(symbols, 1):
        all_picks.append(_score_symbol(sym, spy5, spy20, spy60))
        if on_progress and (i % 20 == 0 or i == n):
            on_progress(f"탐색 {i}/{n} · 단타·장타 점수 계산")
    tradeable = [p for p in all_picks if p.tradeable]
    pool = tradeable or all_picks
    by_short = sorted(pool, key=lambda p: p.dip_score, reverse=True)
    by_long = sorted(pool, key=lambda p: p.long_score, reverse=True)
    by_blend = sorted(pool, key=lambda p: p.screen_score, reverse=True)
    return by_short[:limit_short], by_long[:limit_long], by_blend[: max(limit_short, limit_long)]


def scalp_exit_from_holdings(held: set[str], *, min_rip: float = 0.04) -> list[PickScore]:
    """Holdings that spiked → take-profit / sell-the-rip candidates."""
    if not held:
        return []
    spy5, spy20, spy60, _ = _moms("SPY")
    out: list[PickScore] = []
    for sym in held:
        p = _score_symbol(sym, spy5, spy20, spy60)
        if p.rip_score >= min_rip:
            out.append(p)
    out.sort(key=lambda p: p.rip_score, reverse=True)
    return out


def rank_decisions_for_trade(
    decisions: list[DecisionResult],
    *,
    held: set[str],
    aggressive: bool = False,
) -> tuple[DecisionResult | None, DecisionResult | None]:
    """Return (best_buy, best_sell) from AI decisions + screen boost.

    aggressive=True (hunt mode): lower conf/score bars so more actionable trades surface.
    """
    screen = {p.symbol: p for p in screen_universe(limit=40)}
    buy_cands: list[tuple[float, DecisionResult]] = []
    sell_cands: list[tuple[float, DecisionResult]] = []
    min_conf = 0.28 if aggressive else 0.36
    promote_score = 0.12 if aggressive else 0.22
    promote_conf = 0.38 if aggressive else 0.45
    sell_score = -0.12 if aggressive else -0.18

    for d in decisions:
        if d.risk_veto and d.risk_veto.active and d.action in (Action.BUY, Action.ADD):
            continue
        if d.confidence < min_conf:
            continue
        sc = screen.get(d.symbol)
        boost = sc.screen_score if sc else 0.0
        # Prefer matching horizon edge
        if sc:
            boost += 0.15 * max(sc.short_score, sc.long_score)
        edge = d.composite_score * d.confidence

        if d.action in (Action.BUY, Action.ADD) or (
            d.composite_score > promote_score and d.confidence >= promote_conf
        ):
            if d.risk_veto and d.risk_veto.active:
                continue
            rank = edge + 0.35 * boost + (0.05 if d.symbol not in held else 0.0)
            buy_cands.append((rank, d))

        if d.symbol in held and (
            d.action in (Action.REDUCE, Action.SELL) or d.composite_score < sell_score
        ):
            rank = (-edge) + (0.2 if (sc and sc.screen_score < 0) else 0.0)
            sell_cands.append((rank, d))

    buy_cands.sort(key=lambda x: x[0], reverse=True)
    sell_cands.sort(key=lambda x: x[0], reverse=True)

    best_buy = buy_cands[0][1] if buy_cands else None
    best_sell = sell_cands[0][1] if sell_cands else None

    if best_buy and best_buy.action not in (Action.BUY, Action.ADD):
        if best_buy.composite_score >= promote_score and not (
            best_buy.risk_veto and best_buy.risk_veto.active
        ):
            hz = screen.get(best_buy.symbol)
            tag = f" [{hz.horizon}]" if hz else ""
            best_buy = best_buy.model_copy(
                update={
                    "action": Action.ADD if best_buy.symbol in held else Action.BUY,
                    "rationale": best_buy.rationale
                    + f"\n[PICKER] Strong screen+AI edge{tag} → promote to buy.",
                }
            )
    if best_sell and best_sell.action not in (Action.REDUCE, Action.SELL):
        if best_sell.composite_score <= sell_score:
            best_sell = best_sell.model_copy(
                update={
                    "action": Action.SELL if best_sell.composite_score <= -0.4 else Action.REDUCE,
                    "rationale": best_sell.rationale
                    + "\n[PICKER] Weak holding → promote to reduce/sell.",
                }
            )

    return best_buy, best_sell


def top_picks_summary(limit: int = 8) -> list[dict]:
    short, long, blend = screen_short_and_long(limit_short=limit, limit_long=limit)
    # Merge unique: prefer showing mix of short + long
    seen: set[str] = set()
    ordered: list[PickScore] = []
    for bucket in (short, long, blend):
        for p in bucket:
            if p.symbol in seen:
                continue
            seen.add(p.symbol)
            ordered.append(p)
            if len(ordered) >= limit:
                break
        if len(ordered) >= limit:
            break
    out = []
    for p in ordered:
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
                "mom_5": round(p.mom_5, 4),
                "mom_60": round(p.mom_60, 4),
                "short_score": round(p.short_score, 3),
                "long_score": round(p.long_score, 3),
                "horizon": p.horizon,
                "price": px,
                "reasons": p.reasons,
            }
        )
    return out
