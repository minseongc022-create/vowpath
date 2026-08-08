"""Technical Analysis Agent — trend, momentum, volatility bands."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from oracle.agents.base import conf_from_agreement, opinion
from oracle.core.exceptions import DataUnavailableError
from oracle.core.types import AgentName, Evidence, PortfolioState
from oracle.data.market import cached_history

logger = logging.getLogger("oracle.agents.technical")


def _rsi(close: pd.Series, period: int = 14) -> float:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    val = float(rsi.iloc[-1])
    return val if np.isfinite(val) else 50.0


def _macd_hist(close: pd.Series) -> float:
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    return float(hist.iloc[-1])


def _atr(df: pd.DataFrame, period: int = 14) -> float:
    high, low, close = df["high"], df["low"], df["close"]
    prev_close = close.shift(1)
    tr = pd.concat(
        [(high - low), (high - prev_close).abs(), (low - prev_close).abs()],
        axis=1,
    ).max(axis=1)
    return float(tr.rolling(period).mean().iloc[-1])


class TechnicalAnalysisAgent:
    name = AgentName.TECHNICAL.value

    def analyze(self, symbol: str, portfolio: PortfolioState):
        held = symbol in portfolio.held_symbols()
        try:
            df = cached_history(symbol, days=365)
        except DataUnavailableError as exc:
            return opinion(
                AgentName.TECHNICAL,
                symbol,
                0.0,
                0.2,
                str(exc),
                [Evidence(claim="No OHLCV", source="yfinance", metric="availability", value=0)],
                held,
            )

        close = df["close"]
        if len(close) < 50:
            return opinion(
                AgentName.TECHNICAL,
                symbol,
                0.0,
                0.25,
                "Insufficient history for technicals",
                [Evidence(claim=f"bars={len(close)}", source="yfinance", metric="bars", value=len(close))],
                held,
            )

        evidence: list[Evidence] = []
        parts: list[float] = []

        sma20 = float(close.rolling(20).mean().iloc[-1])
        sma50 = float(close.rolling(50).mean().iloc[-1])
        sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else None
        px = float(close.iloc[-1])

        # Trend stack
        trend = 0.0
        if px > sma20:
            trend += 0.25
        else:
            trend -= 0.25
        if sma20 > sma50:
            trend += 0.35
        else:
            trend -= 0.35
        if sma200 is not None:
            if px > sma200:
                trend += 0.4
            else:
                trend -= 0.4
        parts.append(max(-1.0, min(1.0, trend)))
        evidence.append(
            Evidence(
                claim=f"Price vs MA20/50{'/200' if sma200 else ''}",
                metric="trend_stack",
                value=round(trend, 3),
                source="oracle.ta",
            )
        )

        rsi = _rsi(close)
        if rsi >= 70:
            rsi_part = -0.45
        elif rsi <= 30:
            rsi_part = 0.45
        else:
            rsi_part = (50 - rsi) / 50.0 * 0.2  # mild mean-reversion prior
        parts.append(rsi_part)
        evidence.append(
            Evidence(claim=f"RSI(14)={rsi:.1f}", metric="rsi14", value=rsi, source="oracle.ta")
        )

        macd_h = _macd_hist(close)
        macd_part = max(-1.0, min(1.0, macd_h / (px * 0.01 + 1e-9)))
        parts.append(macd_part * 0.6)
        evidence.append(
            Evidence(
                claim=f"MACD histogram={macd_h:.4f}",
                metric="macd_hist",
                value=macd_h,
                source="oracle.ta",
            )
        )

        # Bollinger position
        mid = close.rolling(20).mean()
        std = close.rolling(20).std()
        upper = mid + 2 * std
        lower = mid - 2 * std
        upper_b = float(upper.iloc[-1])
        lower_b = float(lower.iloc[-1])
        mid_b = float(mid.iloc[-1])
        bandwidth = (upper_b - lower_b) / mid_b if mid_b else 0
        bb_pos = (px - lower_b) / (upper_b - lower_b) if upper_b != lower_b else 0.5
        # near upper → cautious; near lower → constructive (mean reversion tilt)
        bb_part = max(-1.0, min(1.0, (0.5 - bb_pos) * 1.2))
        parts.append(bb_part * 0.5)
        evidence.append(
            Evidence(
                claim=f"Bollinger position={bb_pos:.2f}, bandwidth={bandwidth:.3f}",
                metric="bb_pos",
                value=bb_pos,
                source="oracle.ta",
            )
        )

        # Volume confirmation
        vol = df["volume"]
        vol_sma = float(vol.rolling(20).mean().iloc[-1])
        vol_ratio = float(vol.iloc[-1]) / vol_sma if vol_sma else 1.0
        ret1 = float(close.pct_change().iloc[-1])
        if vol_ratio > 1.3:
            vol_part = 0.25 if ret1 > 0 else -0.25
            parts.append(vol_part)
            evidence.append(
                Evidence(
                    claim=f"Volume spike x{vol_ratio:.2f} with return {ret1:.2%}",
                    metric="volume_ratio",
                    value=vol_ratio,
                    source="oracle.ta",
                )
            )

        atr = _atr(df)
        atr_pct = atr / px if px else 0
        evidence.append(
            Evidence(
                claim=f"ATR(14)={atr:.2f} ({atr_pct:.2%} of price)",
                metric="atr_pct",
                value=atr_pct,
                source="oracle.ta",
            )
        )

        score = sum(parts) / len(parts) if parts else 0.0
        conf = conf_from_agreement(parts, base=0.42)
        summary = (
            f"Technical stance for {symbol}: trend/momentum mix score={score:.2f}. "
            "Chart signals can fail; treat as one input among many."
        )
        return opinion(
            AgentName.TECHNICAL,
            symbol,
            score,
            conf,
            summary,
            evidence,
            held,
            metadata={"rsi": rsi, "atr_pct": atr_pct, "sma20": sma20, "sma50": sma50},
        )
