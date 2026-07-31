"""Strategy backtests: SMA + multi-factor signal replay with full metrics."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from oracle.backtest.metrics import PerformanceMetrics, compute_metrics
from oracle.data.market import fetch_history


@dataclass
class BacktestResult:
    symbol: str
    strategy: str
    total_return: float
    ann_return: float
    cagr: float
    sharpe: float
    sortino: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    volatility: float
    calmar: float
    n_trades: int
    equity_curve: list[float]
    metrics: PerformanceMetrics | None = None


def _cost_series(signal: pd.Series, commission_bps: float, slippage_bps: float) -> pd.Series:
    pos_change = signal.diff().abs().fillna(signal.abs())
    return pos_change * ((commission_bps + slippage_bps) / 10_000.0)


def _signals_from_sma(close: pd.Series, fast: int = 20, slow: int = 50) -> pd.Series:
    f = close.rolling(fast).mean()
    s = close.rolling(slow).mean()
    sig = (f > s).astype(float)
    return sig.shift(1).fillna(0.0)


def _oracle_lite_signal(df: pd.DataFrame) -> pd.Series:
    """Deterministic replay of Technical+Quant lite rules (no look-ahead)."""
    close = df["close"]
    sma20 = close.rolling(20).mean()
    sma50 = close.rolling(50).mean()
    vol = close.pct_change().rolling(20).std() * np.sqrt(252)
    mom = close.pct_change(63)
    # long when trend up, momentum positive, vol not extreme
    raw = ((close > sma20) & (sma20 > sma50) & (mom > 0) & (vol < 0.45)).astype(float)
    return raw.shift(1).fillna(0.0)


def _pack(
    symbol: str,
    strategy: str,
    equity: pd.Series,
    strat: pd.Series,
    signal: pd.Series,
) -> BacktestResult:
    trades = int((signal.diff().fillna(0) != 0).sum())
    metrics = compute_metrics(equity, strat, n_trades=trades)
    return BacktestResult(
        symbol=symbol,
        strategy=strategy,
        total_return=metrics.total_return,
        ann_return=metrics.cagr,
        cagr=metrics.cagr,
        sharpe=metrics.sharpe,
        sortino=metrics.sortino,
        max_drawdown=metrics.max_drawdown,
        win_rate=metrics.win_rate,
        profit_factor=metrics.profit_factor,
        volatility=metrics.volatility,
        calmar=metrics.calmar,
        n_trades=metrics.n_trades,
        equity_curve=[float(x) for x in equity.tolist()[:: max(1, len(equity) // 100)]],
        metrics=metrics,
    )


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
    cost = _cost_series(signal, commission_bps, slippage_bps)
    strat = signal * rets - cost
    equity = (1.0 + strat).cumprod()
    return _pack(symbol, f"sma_{fast}_{slow}", equity, strat, signal)


def run_oracle_lite_backtest(
    symbol: str,
    days: int = 750,
    commission_bps: float = 5,
    slippage_bps: float = 5,
) -> BacktestResult:
    df = fetch_history(symbol, days=days)
    signal = _oracle_lite_signal(df)
    rets = df["close"].pct_change().fillna(0.0)
    cost = _cost_series(signal, commission_bps, slippage_bps)
    strat = signal * rets - cost
    equity = (1.0 + strat).cumprod()
    return _pack(symbol, "oracle_lite", equity, strat, signal)


def run_portfolio_backtest(
    symbols: list[str],
    days: int = 750,
    commission_bps: float = 5,
    slippage_bps: float = 5,
    weight_cap: float = 0.2,
) -> BacktestResult:
    """Equal-risk-ish: each name gets oracle_lite signal, equal weight when long."""
    frames = {}
    signals = {}
    for s in symbols:
        df = fetch_history(s, days=days)
        frames[s] = df["close"].pct_change().fillna(0.0)
        signals[s] = _oracle_lite_signal(df)
    rets = pd.DataFrame(frames).dropna(how="all").fillna(0.0)
    sigs = pd.DataFrame(signals).reindex(rets.index).fillna(0.0)
    # normalize long weights each day
    long_count = sigs.sum(axis=1).replace(0, np.nan)
    weights = sigs.div(long_count, axis=0).fillna(0.0).clip(upper=weight_cap)
    # renorm after clip
    row_sum = weights.sum(axis=1).replace(0, np.nan)
    weights = weights.div(row_sum, axis=0).fillna(0.0)
    port = (weights * rets).sum(axis=1)
    turnover = weights.diff().abs().sum(axis=1).fillna(weights.abs().sum(axis=1))
    cost = turnover * ((commission_bps + slippage_bps) / 10_000.0)
    strat = port - cost
    equity = (1.0 + strat).cumprod()
    dummy_sig = (weights.sum(axis=1) > 0).astype(float)
    return _pack("PORTFOLIO", "oracle_lite_portfolio", equity, strat, dummy_sig)
