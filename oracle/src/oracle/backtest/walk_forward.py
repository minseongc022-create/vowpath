"""Walk-forward backtest with OOS metrics + buy-and-hold benchmark."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import pandas as pd

from oracle.backtest.engine import _oracle_lite_signal
from oracle.backtest.metrics import PerformanceMetrics, compute_metrics
from oracle.data.market import fetch_history


@dataclass
class WalkForwardFold:
    fold: int
    train_start: str
    train_end: str
    test_start: str
    test_end: str
    oos_total_return: float
    oos_sharpe: float
    oos_max_drawdown: float
    benchmark_return: float
    excess_return: float


@dataclass
class WalkForwardResult:
    symbol: str
    folds: list[WalkForwardFold]
    oos_total_return: float
    oos_cagr: float
    oos_sharpe: float
    oos_max_drawdown: float
    oos_win_rate: float
    benchmark_total_return: float
    excess_return: float
    n_folds: int
    equity_curve: list[float]
    metrics: PerformanceMetrics | None = None

    def to_dict(self) -> dict:
        d = asdict(self)
        if self.metrics:
            d["metrics"] = asdict(self.metrics)
        return d


def run_walk_forward(
    symbol: str,
    days: int = 1000,
    train_bars: int = 252,
    test_bars: int = 63,
    step_bars: int = 63,
    commission_bps: float = 5,
    slippage_bps: float = 5,
) -> WalkForwardResult:
    df = fetch_history(symbol, days=max(days, train_bars + test_bars + 30))
    close = df["close"]
    signal_full = _oracle_lite_signal(df)
    rets = close.pct_change().fillna(0.0)
    cost_rate = (commission_bps + slippage_bps) / 10_000.0

    folds: list[WalkForwardFold] = []
    oos_rets = []
    bench_rets = []
    start = train_bars
    fold_i = 0
    while start + test_bars <= len(close):
        train_slice = slice(start - train_bars, start)
        test_slice = slice(start, start + test_bars)
        sig = signal_full.iloc[test_slice]
        r = rets.iloc[test_slice]
        turnover = sig.diff().abs().fillna(sig.abs())
        strat = sig * r - turnover * cost_rate
        bench = r
        oos_rets.append(strat)
        bench_rets.append(bench)

        eq = (1 + strat).cumprod()
        m = compute_metrics(eq, strat, n_trades=int((sig.diff().fillna(0) != 0).sum()))
        b_total = float((1 + bench).prod() - 1)
        folds.append(
            WalkForwardFold(
                fold=fold_i,
                train_start=str(close.index[train_slice][0].date()),
                train_end=str(close.index[train_slice][-1].date()),
                test_start=str(close.index[test_slice][0].date()),
                test_end=str(close.index[test_slice][-1].date()),
                oos_total_return=m.total_return,
                oos_sharpe=m.sharpe,
                oos_max_drawdown=m.max_drawdown,
                benchmark_return=b_total,
                excess_return=m.total_return - b_total,
            )
        )
        fold_i += 1
        start += step_bars

    if not oos_rets:
        empty = PerformanceMetrics(
            total_return=0,
            cagr=0,
            sharpe=0,
            sortino=0,
            max_drawdown=0,
            win_rate=0,
            profit_factor=0,
            volatility=0,
            calmar=0,
            n_trades=0,
            n_bars=0,
        )
        return WalkForwardResult(
            symbol=symbol,
            folds=[],
            oos_total_return=0,
            oos_cagr=0,
            oos_sharpe=0,
            oos_max_drawdown=0,
            oos_win_rate=0,
            benchmark_total_return=0,
            excess_return=0,
            n_folds=0,
            equity_curve=[1.0],
            metrics=empty,
        )

    strat_all = pd.concat(oos_rets)
    bench_all = pd.concat(bench_rets)
    equity = (1 + strat_all).cumprod()
    metrics = compute_metrics(
        equity, strat_all, n_trades=sum(1 for f in folds if f.oos_total_return != 0)
    )
    bench_total = float((1 + bench_all).prod() - 1)
    return WalkForwardResult(
        symbol=symbol,
        folds=folds,
        oos_total_return=metrics.total_return,
        oos_cagr=metrics.cagr,
        oos_sharpe=metrics.sharpe,
        oos_max_drawdown=metrics.max_drawdown,
        oos_win_rate=metrics.win_rate,
        benchmark_total_return=bench_total,
        excess_return=metrics.total_return - bench_total,
        n_folds=len(folds),
        equity_curve=[float(x) for x in equity.tolist()[:: max(1, len(equity) // 100)]],
        metrics=metrics,
    )


def write_walk_forward_report(result: WalkForwardResult, output_dir: str | None = None) -> str:
    import json
    from pathlib import Path

    from oracle.config import get_settings

    settings = get_settings()
    out = Path(output_dir or settings.report_output_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"walk_forward_{result.symbol}.md"
    lines = [
        f"# Walk-forward — {result.symbol}",
        "",
        f"- Folds: {result.n_folds}",
        f"- OOS total return: {result.oos_total_return:.1%}",
        f"- OOS CAGR: {result.oos_cagr:.1%}",
        f"- OOS Sharpe: {result.oos_sharpe:.2f}",
        f"- OOS Max DD: {result.oos_max_drawdown:.1%}",
        f"- Buy&hold: {result.benchmark_total_return:.1%}",
        f"- Excess vs B&H: {result.excess_return:.1%}",
        "",
        "| Fold | Train | Test | OOS ret | Sharpe | MDD | B&H | Excess |",
        "|------|-------|------|---------|--------|-----|-----|--------|",
    ]
    for f in result.folds:
        lines.append(
            f"| {f.fold} | {f.train_start}→{f.train_end} | {f.test_start}→{f.test_end} | "
            f"{f.oos_total_return:.1%} | {f.oos_sharpe:.2f} | {f.oos_max_drawdown:.1%} | "
            f"{f.benchmark_return:.1%} | {f.excess_return:.1%} |"
        )
    lines += ["", "Walk-forward OOS results are estimates, not guarantees."]
    path.write_text("\n".join(lines), encoding="utf-8")
    (out / f"walk_forward_{result.symbol}.json").write_text(
        json.dumps(result.to_dict(), indent=2), encoding="utf-8"
    )
    return str(path)
