"""Daily report generation (markdown)."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from oracle.config import get_settings
from oracle.core.types import PipelineResult
from oracle.portfolio.store import load_portfolio


def render_daily_report(result: PipelineResult) -> str:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    now = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")

    lines = [
        "# Project Oracle — Daily Report",
        "",
        f"**Generated:** {now}  ",
        f"**Run ID:** `{result.run_id}`  ",
        f"**Session:** {result.session}  ",
        "",
        "## Mandate reminder",
        "",
        "- Risk minimization outranks return chasing.",
        "- Inaction is a valid decision.",
        "- No statement below is certain.",
        "",
        "## Market summary",
        "",
        result.market_summary,
        "",
        "## Portfolio",
        "",
        f"- Equity (mark-to-market): **${result.portfolio_equity:,.2f}**",
        f"- Cash: ${portfolio.cash:,.2f}",
        f"- Portfolio risk score: **{result.portfolio_risk_score:.2f}** (0=calm, 1=extreme)",
        "",
        "| Symbol | Shares | Avg cost | Price | Weight | Unrealized |",
        "|--------|--------|----------|-------|--------|------------|",
    ]
    for p in portfolio.positions:
        w = portfolio.weight(p.symbol)
        pnl = f"{p.unrealized_pnl_pct:.1%}" if p.unrealized_pnl_pct is not None else "n/a"
        px = f"{p.market_price:.2f}" if p.market_price is not None else "n/a"
        lines.append(
            f"| {p.symbol} | {p.shares:g} | {p.avg_cost:.2f} | {px} | {w:.1%} | {pnl} |"
        )

    lines += [
        "",
        "## Recommended actions",
        "",
        "| Symbol | Action | Confidence | Composite | Risk veto |",
        "|--------|--------|------------|-----------|-----------|",
    ]
    for d in result.decisions:
        veto = "YES" if d.risk_veto and d.risk_veto.active else "no"
        lines.append(
            f"| {d.symbol} | {d.action.value} | {d.confidence:.2f} | "
            f"{d.composite_score:+.3f} | {veto} |"
        )

    lines += ["", "## Rationale detail", ""]
    for d in result.decisions:
        if d.action.value in ("Hold", "Do Nothing") and abs(d.composite_score) < 0.2:
            # keep report readable — short form for quiet names
            lines.append(f"### {d.symbol} — {d.action.value} (conf={d.confidence:.2f})")
            lines.append("")
            lines.append(d.rationale.split("\n")[0])
            lines.append("")
            continue
        lines.append(f"### {d.symbol} — {d.action.value} (conf={d.confidence:.2f})")
        lines.append("")
        lines.append("```")
        lines.append(d.rationale)
        lines.append("```")
        lines.append("")

    lines += [
        "## Watch next",
        "",
        "- Re-run pre-market and post-market sessions.",
        "- Backtest any new rule before sizing capital (`oracle backtest --symbol SPY`).",
        "- Phase 2: wire FRED/SEC/social feeds; do not invent missing data.",
        "",
        "---",
        f"_Project Oracle v{settings.version} — probabilistic decision support, not a guarantee._",
    ]
    return "\n".join(lines)


def write_daily_report(result: PipelineResult, output_dir: str | Path | None = None) -> Path:
    settings = get_settings()
    out = Path(output_dir or settings.report_output_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"daily_{result.run_id}.md"
    path.write_text(render_daily_report(result), encoding="utf-8")
    # also refresh latest.md
    (out / "latest.md").write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
    return path
