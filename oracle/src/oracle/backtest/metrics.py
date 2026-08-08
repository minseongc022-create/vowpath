"""Performance metrics for backtests."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class PerformanceMetrics:
    total_return: float
    cagr: float
    sharpe: float
    sortino: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    volatility: float
    calmar: float
    n_trades: int
    n_bars: int


def compute_metrics(
    equity: pd.Series,
    strategy_returns: pd.Series,
    n_trades: int = 0,
) -> PerformanceMetrics:
    equity = equity.dropna()
    rets = strategy_returns.dropna()
    n = len(rets)
    total = float(equity.iloc[-1] / equity.iloc[0] - 1.0) if len(equity) > 1 else 0.0
    years = max(n / 252.0, 1e-9)
    cagr = float((1.0 + total) ** (1 / years) - 1.0) if years > 0 else 0.0
    vol = float(rets.std(ddof=1) * np.sqrt(252)) if rets.std(ddof=1) > 0 else 0.0
    sharpe = float(rets.mean() / rets.std(ddof=1) * np.sqrt(252)) if rets.std(ddof=1) > 0 else 0.0
    downside = rets[rets < 0]
    sortino = (
        float(rets.mean() / downside.std(ddof=1) * np.sqrt(252))
        if len(downside) and downside.std(ddof=1) > 0
        else 0.0
    )
    peak = equity.cummax()
    mdd = float(((equity - peak) / peak).min())
    mdd_abs = abs(mdd)
    wins = rets[rets > 0]
    losses = rets[rets < 0]
    win_rate = float((rets > 0).mean()) if n else 0.0
    gross_win = float(wins.sum()) if len(wins) else 0.0
    gross_loss = float(-losses.sum()) if len(losses) else 0.0
    pf = gross_win / gross_loss if gross_loss > 0 else (float("inf") if gross_win > 0 else 0.0)
    calmar = cagr / mdd_abs if mdd_abs > 0 else 0.0
    return PerformanceMetrics(
        total_return=total,
        cagr=cagr,
        sharpe=sharpe,
        sortino=sortino,
        max_drawdown=mdd_abs,
        win_rate=win_rate,
        profit_factor=pf if np.isfinite(pf) else 99.0,
        volatility=vol,
        calmar=calmar,
        n_trades=n_trades,
        n_bars=n,
    )
