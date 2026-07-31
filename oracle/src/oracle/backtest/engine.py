"""Minimal vector backtest for signal sanity checks before live capital."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from oracle.data.market import fetch_history


@dataclass
class BacktestResult:
    symbol: str
    total_return: float
    ann_return: float
    sharpe: float
    max_drawdown: float
    win_rate: float
    n_trades: int
    equity_curve: list[float]


def _signals_from_sma(close: pd.Series, fast: int = 20, slow: int = 50) -> pd.Series:
    f = close.rolling(fast).mean()
    s = close.rolling(slow).mean()
    sig = (f > s).astype(float)
    return sig.shift(1).fillna(0.0)  # no look-ahead


def run_sma_backtest(
    symbol: str,
    days: int = 500,
    fast: int = 20,
    slow: int = 50,
    commission_bps: float = 5,
    slippage_bps: float = 5,
) -> BacktestResult:
    df = fetch_history(symbol, days=days)
    close = df["close"]
    signal = _signals_from_sma(close, fast=fast, slow=slow)
    rets = close.pct_change().fillna(0.0)
    pos_change = signal.diff().abs().fillna(signal)
    cost = pos_change * ((commission_bps + slippage_bps) / 10_000.0)
    strat = signal * rets - cost
    equity = (1.0 + strat).cumprod()

    total_return = float(equity.iloc[-1] - 1.0)
    n = len(strat)
    ann = float((1.0 + total_return) ** (252 / max(n, 1)) - 1.0) if n > 1 else 0.0
    sharpe = float(strat.mean() / strat.std(ddof=1) * np.sqrt(252)) if strat.std(ddof=1) > 0 else 0.0
    peak = equity.cummax()
    mdd = float(((equity - peak) / peak).min())
    trades = signal.diff().fillna(0) != 0
    # win rate on days when in position and return != 0
    active = strat[signal > 0]
    win_rate = float((active > 0).mean()) if len(active) else 0.0

    return BacktestResult(
        symbol=symbol,
        total_return=total_return,
        ann_return=ann,
        sharpe=sharpe,
        max_drawdown=abs(mdd),
        win_rate=win_rate,
        n_trades=int(trades.sum()),
        equity_curve=[float(x) for x in equity.tolist()[:: max(1, len(equity) // 100)]],
    )
