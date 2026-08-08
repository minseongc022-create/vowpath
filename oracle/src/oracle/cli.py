"""CLI: run | report | backtest | status | serve | schedule | execute | journal | size."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from rich.console import Console
from rich.table import Table

from oracle import __version__
from oracle.backtest import (
    run_oracle_lite_backtest,
    run_portfolio_backtest,
    run_sma_backtest,
    run_walk_forward,
    write_walk_forward_report,
)
from oracle.config import get_settings
from oracle.logging_setup import setup_logging
from oracle.orchestration import OraclePipeline, infer_session, run_forever
from oracle.portfolio.journal import TradeJournal
from oracle.portfolio.sizing import size_decision
from oracle.portfolio.store import DecisionStore, load_portfolio
from oracle.reports import write_daily_report

console = Console()


def _add_log_level(sp: argparse.ArgumentParser) -> None:
    sp.add_argument("--log-level", default="INFO")


def cmd_run(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    session = args.session or infer_session(tz_name=settings.timezone)
    symbols = [s.strip().upper() for s in args.symbols.split(",")] if args.symbols else None
    result = OraclePipeline(settings).run(session=session, symbols=symbols)

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
        if args.notify:
            from oracle.notify import notify_report

            console.print(notify_report(path))

    if args.json:
        print(result.model_dump_json(indent=2))
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    session = args.session or infer_session(tz_name=settings.timezone)
    result = OraclePipeline(settings).run(session=session)
    path = write_daily_report(result)
    console.print(f"Daily report: {path}")
    if args.notify:
        from oracle.notify import notify_report

        console.print(notify_report(path))
    return 0


def cmd_backtest(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level)
    if args.portfolio:
        symbols = [s.strip().upper() for s in (args.symbols or ",".join(settings.symbols[:5])).split(",")]
        result = run_portfolio_backtest(
            symbols,
            days=args.days,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
        console.print(
            f"[bold]{result.strategy} — {result.symbol}[/bold]\n"
            f"Total return: {result.total_return:.1%}\n"
            f"CAGR:         {result.cagr:.1%}\n"
            f"Sharpe:       {result.sharpe:.2f}\n"
            f"Max DD:       {result.max_drawdown:.1%}\n"
            f"Win rate:     {result.win_rate:.1%}\n"
            f"Trades:       {result.n_trades}"
        )
        return 0

    if args.strategy == "walk_forward":
        wf = run_walk_forward(
            args.symbol.upper(),
            days=args.days,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
        path = write_walk_forward_report(wf)
        console.print(
            f"[bold]walk_forward — {wf.symbol}[/bold]\n"
            f"Folds:        {wf.n_folds}\n"
            f"OOS return:   {wf.oos_total_return:.1%}\n"
            f"OOS CAGR:     {wf.oos_cagr:.1%}\n"
            f"OOS Sharpe:   {wf.oos_sharpe:.2f}\n"
            f"OOS Max DD:   {wf.oos_max_drawdown:.1%}\n"
            f"Buy&hold:     {wf.benchmark_total_return:.1%}\n"
            f"Excess:       {wf.excess_return:.1%}\n"
            f"Report:       {path}"
        )
        return 0

    if args.strategy == "oracle_lite":
        result = run_oracle_lite_backtest(
            args.symbol.upper(),
            days=args.days,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
    else:
        result = run_sma_backtest(
            symbol=args.symbol.upper(),
            days=args.days,
            fast=args.fast,
            slow=args.slow,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
    console.print(
        f"[bold]{result.strategy} — {result.symbol}[/bold]\n"
        f"Total return: {result.total_return:.1%}\n"
        f"CAGR:         {result.cagr:.1%}\n"
        f"Sharpe:       {result.sharpe:.2f}\n"
        f"Sortino:      {result.sortino:.2f}\n"
        f"Max DD:       {result.max_drawdown:.1%}\n"
        f"Win rate:     {result.win_rate:.1%}\n"
        f"Profit factor:{result.profit_factor:.2f}\n"
        f"Vol:          {result.volatility:.1%}\n"
        f"Calmar:       {result.calmar:.2f}\n"
        f"Trades:       {result.n_trades}\n"
        "Past performance does not imply future results."
    )
    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    from oracle.execution import ExecutionEngine

    setup_logging(level=args.log_level)
    engine = ExecutionEngine(require_confirm=False)
    if args.reject:
        out = engine.reject_journal_entry(args.id)
    else:
        out = engine.confirm_journal_entry(args.id)
    console.print(f"{out.message} (accepted={out.accepted})")
    return 0 if out.accepted else 1


def cmd_kill(args: argparse.Namespace) -> int:
    from oracle.execution import KillSwitch

    ks = KillSwitch()
    if args.off:
        ks.release()
        console.print("Kill switch released")
    else:
        ks.engage()
        console.print("Kill switch ENGAGED")
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
        recent = DecisionStore(db).recent_decisions(limit=10)
        if recent:
            console.print(json.dumps(recent, indent=2))
    return 0


def cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    setup_logging(level=args.log_level)
    uvicorn.run(
        "oracle.dashboard.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


def cmd_schedule(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    console.print(f"Starting 24h scheduler poll={args.poll}s")
    run_forever(poll_seconds=args.poll)
    return 0


def cmd_execute(args: argparse.Namespace) -> int:
    from oracle.execution import ExecutionEngine

    settings = get_settings()
    setup_logging(level=args.log_level, log_dir=Path(settings.data_dir) / "logs")
    symbols = [s.strip().upper() for s in args.symbols.split(",")] if args.symbols else settings.symbols
    result = OraclePipeline(settings).run(session="ad_hoc", symbols=symbols)
    engine = ExecutionEngine(require_confirm=not args.confirm)
    portfolio = load_portfolio(settings.portfolio_path)
    for d in result.decisions:
        if d.action.value in ("Hold", "Do Nothing") and not args.all:
            continue
        out = engine.execute_decision(d, portfolio=portfolio, confirm=args.confirm)
        console.print(f"{d.symbol} {d.action.value}: {out.message} (accepted={out.accepted})")
        if out.accepted and out.mode == "paper":
            portfolio = load_portfolio(settings.portfolio_path)
    return 0


def cmd_journal(args: argparse.Namespace) -> int:
    rows = TradeJournal().list_recent(limit=args.limit)
    console.print(json.dumps(rows, indent=2))
    return 0


def cmd_size(args: argparse.Namespace) -> int:
    settings = get_settings()
    setup_logging(level=args.log_level)
    symbols = [args.symbol.upper()]
    result = OraclePipeline(settings).run(session="ad_hoc", symbols=symbols)
    portfolio = load_portfolio(settings.portfolio_path)
    for d in result.decisions:
        rec = size_decision(d, portfolio)
        console.print(
            f"{rec.symbol} {rec.action.value}: Δshares={rec.suggested_shares_delta:+.4f} "
            f"Δ$={rec.dollar_delta:+,.2f} target_w={rec.target_weight:.1%}\n{rec.rationale}"
        )
    return 0


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
    run.add_argument("--symbols", help="Comma-separated subset")
    run.add_argument("--report", action="store_true")
    run.add_argument("--notify", action="store_true")
    run.add_argument("--json", action="store_true")
    run.set_defaults(func=cmd_run)

    rep = sub.add_parser("report", help="Run pipeline + daily report")
    _add_log_level(rep)
    rep.add_argument("--session", choices=["pre_market", "market_open", "post_market", "ad_hoc"])
    rep.add_argument("--notify", action="store_true")
    rep.set_defaults(func=cmd_report)

    bt = sub.add_parser("backtest", help="Backtest strategies")
    _add_log_level(bt)
    bt.add_argument("--symbol", default="SPY")
    bt.add_argument("--symbols", help="For --portfolio mode")
    bt.add_argument("--days", type=int, default=500)
    bt.add_argument("--fast", type=int, default=20)
    bt.add_argument("--slow", type=int, default=50)
    bt.add_argument("--strategy", choices=["sma", "oracle_lite", "walk_forward"], default="sma")
    bt.add_argument("--portfolio", action="store_true", help="Multi-asset oracle_lite portfolio")
    bt.set_defaults(func=cmd_backtest)

    st = sub.add_parser("status", help="Portfolio + recent decisions")
    _add_log_level(st)
    st.set_defaults(func=cmd_status)

    serve = sub.add_parser("serve", help="Start operator dashboard")
    _add_log_level(serve)
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--port", type=int, default=8080)
    serve.add_argument("--reload", action="store_true")
    serve.set_defaults(func=cmd_serve)

    sched = sub.add_parser("schedule", help="24h session daemon")
    _add_log_level(sched)
    sched.add_argument("--poll", type=int, default=3600)
    sched.set_defaults(func=cmd_schedule)

    ex = sub.add_parser("execute", help="Paper/live execution with human confirm")
    _add_log_level(ex)
    ex.add_argument("--symbols")
    ex.add_argument("--confirm", action="store_true", help="Approve planned fills")
    ex.add_argument("--all", action="store_true", help="Include Hold/Do Nothing in journal")
    ex.set_defaults(func=cmd_execute)

    jn = sub.add_parser("journal", help="Show paper trade journal")
    _add_log_level(jn)
    jn.add_argument("--limit", type=int, default=30)
    jn.set_defaults(func=cmd_journal)

    sz = sub.add_parser("size", help="Vol-target size recommendation for one symbol")
    _add_log_level(sz)
    sz.add_argument("--symbol", required=True)
    sz.set_defaults(func=cmd_size)

    ap = sub.add_parser("approve", help="Approve or reject a planned journal entry")
    _add_log_level(ap)
    ap.add_argument("--id", type=int, required=True)
    ap.add_argument("--reject", action="store_true")
    ap.set_defaults(func=cmd_approve)

    kill = sub.add_parser("kill", help="Engage/release kill switch")
    _add_log_level(kill)
    kill.add_argument("--off", action="store_true", help="Release kill switch")
    kill.set_defaults(func=cmd_kill)
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
