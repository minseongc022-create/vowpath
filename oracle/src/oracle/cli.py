"""CLI entrypoint: oracle run | report | backtest | status."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

from oracle import __version__
from oracle.backtest import run_sma_backtest
from oracle.config import get_settings
from oracle.logging_setup import setup_logging
from oracle.orchestration import OraclePipeline, infer_session
from oracle.portfolio.store import DecisionStore, load_portfolio
from oracle.reports import write_daily_report

console = Console()


def cmd_run(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    session = args.session or infer_session(tz_name=settings.timezone)
    symbols = [s.strip().upper() for s in args.symbols.split(",")] if args.symbols else None
    pipeline = OraclePipeline(settings)
    result = pipeline.run(session=session, symbols=symbols)

    table = Table(title=f"Project Oracle — {session} ({result.run_id})")
    table.add_column("Symbol")
    table.add_column("Action")
    table.add_column("Score")
    table.add_column("Conf")
    table.add_column("Veto")
    for d in result.decisions:
        table.add_row(
            d.symbol,
            d.action.value,
            f"{d.composite_score:+.3f}",
            f"{d.confidence:.2f}",
            "YES" if d.risk_veto and d.risk_veto.active else "no",
        )
    console.print(table)
    console.print(f"Equity: ${result.portfolio_equity:,.2f} | Risk score: {result.portfolio_risk_score:.2f}")
    console.print(result.market_summary)

    if args.report:
        path = write_daily_report(result)
        console.print(f"Report written: {path}")

    if args.json:
        print(result.model_dump_json(indent=2))
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    session = args.session or infer_session(tz_name=settings.timezone)
    pipeline = OraclePipeline(settings)
    result = pipeline.run(session=session)
    path = write_daily_report(result)
    console.print(f"Daily report: {path}")
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level)
    result = run_sma_backtest(
        symbol=args.symbol.upper(),
        days=args.days,
        fast=args.fast,
        slow=args.slow,
        commission_bps=settings.commission_bps,
        slippage_bps=settings.slippage_bps,
    )
    console.print(
        f"[bold]SMA({args.fast}/{args.slow}) backtest — {result.symbol}[/bold]\n"
        f"Total return: {result.total_return:.1%}\n"
        f"Ann. return:  {result.ann_return:.1%}\n"
        f"Sharpe:       {result.sharpe:.2f}\n"
        f"Max DD:       {result.max_drawdown:.1%}\n"
        f"Win rate:     {result.win_rate:.1%}\n"
        f"Trades:       {result.n_trades}\n"
        "Note: past performance does not imply future results."
    )
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    console.print(f"Project Oracle v{__version__}")
    console.print(f"Equity: ${portfolio.equity():,.2f} | Cash: ${portfolio.cash:,.2f}")
    table = Table(title="Holdings")
    table.add_column("Symbol")
    table.add_column("Shares")
    table.add_column("Avg cost")
    table.add_column("Price")
    table.add_column("Weight")
    for p in portfolio.positions:
        table.add_row(
            p.symbol,
            f"{p.shares:g}",
            f"{p.avg_cost:.2f}",
            f"{p.market_price:.2f}" if p.market_price else "n/a",
            f"{portfolio.weight(p.symbol):.1%}",
        )
    console.print(table)

    db = Path(settings.data_dir) / "oracle.db"
    if db.exists():
        store = DecisionStore(db)
        recent = store.recent_decisions(limit=10)
        if recent:
            console.print("Recent decisions:")
            console.print(json.dumps(recent, indent=2))
    return 0


def _add_log_level(sp: argparse.ArgumentParser) -> None:
    sp.add_argument("--log-level", default="INFO")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="oracle",
        description="Project Oracle — multi-agent AI asset management (risk-first)",
    )
    p.add_argument("--version", action="version", version=f"Project Oracle {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Run multi-agent pipeline")
    _add_log_level(run)
    run.add_argument("--session", choices=["pre_market", "market_open", "post_market", "ad_hoc"])
    run.add_argument("--symbols", help="Comma-separated subset, e.g. SPY,AAPL")
    run.add_argument("--report", action="store_true", help="Also write daily markdown report")
    run.add_argument("--json", action="store_true", help="Print full JSON result")
    run.set_defaults(func=cmd_run)

    rep = sub.add_parser("report", help="Run pipeline and write daily report")
    _add_log_level(rep)
    rep.add_argument("--session", choices=["pre_market", "market_open", "post_market", "ad_hoc"])
    rep.set_defaults(func=cmd_report)

    bt = sub.add_parser("backtest", help="SMA crossover sanity backtest")
    _add_log_level(bt)
    bt.add_argument("--symbol", default="SPY")
    bt.add_argument("--days", type=int, default=500)
    bt.add_argument("--fast", type=int, default=20)
    bt.add_argument("--slow", type=int, default=50)
    bt.set_defaults(func=cmd_backtest)

    st = sub.add_parser("status", help="Show portfolio + recent decisions")
    _add_log_level(st)
    st.set_defaults(func=cmd_status)
    return p


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        code = args.func(args)
    except KeyboardInterrupt:
        console.print("Interrupted")
        code = 130
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        code = 1
    sys.exit(code)


if __name__ == "__main__":
    main()
