"""FastAPI operator dashboard — equity, risk, decisions, calendar, news, logs."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from oracle import __version__
from oracle.config import get_settings
from oracle.data.calendar import calendar_as_dicts
from oracle.data.macro import macro_as_dict
from oracle.data.news import aggregate_market_headlines
from oracle.execution import KillSwitch
from oracle.portfolio.journal import TradeJournal
from oracle.portfolio.store import DecisionStore, load_portfolio

APP_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(APP_DIR / "templates"))

app = FastAPI(title="Project Oracle", version=__version__)
static_dir = APP_DIR / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


def _context() -> dict:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    store = DecisionStore(Path(settings.data_dir) / "oracle.db")
    decisions = store.recent_decisions(limit=40)
    journal = TradeJournal().list_recent(limit=20)
    headlines = aggregate_market_headlines(settings.symbols[:6], per_symbol=2)
    ks = KillSwitch().check(0.0)
    equity = portfolio.equity()
    cost_basis = portfolio.cash + sum(p.shares * p.avg_cost for p in portfolio.positions)
    ret = (equity / cost_basis - 1.0) if cost_basis > 0 else 0.0
    rows = []
    for p in portfolio.positions:
        mv = p.market_value or 0.0
        pnl = p.unrealized_pnl_pct
        rows.append(
            {
                "symbol": p.symbol,
                "shares": p.shares,
                "avg_cost": p.avg_cost,
                "price": p.market_price,
                "weight": portfolio.weight(p.symbol),
                "pnl_pct": pnl,
                "value": mv,
            }
        )
    avg_conf = (
        sum(float(d.get("confidence") or 0) for d in decisions) / len(decisions)
        if decisions
        else 0.0
    )
    log_path = Path(settings.data_dir) / "logs" / "oracle.log"
    logs = []
    if log_path.exists():
        logs = log_path.read_text(encoding="utf-8", errors="ignore").splitlines()[-40:]
    return {
        "version": __version__,
        "equity": equity,
        "cash": portfolio.cash,
        "return_pct": ret,
        "positions": rows,
        "decisions": decisions,
        "journal": journal,
        "calendar": calendar_as_dicts(21),
        "macro": macro_as_dict(),
        "headlines": [{"title": h.title, "publisher": h.publisher, "link": h.link} for h in headlines[:12]],
        "avg_confidence": avg_conf,
        "kill_switch": ks,
        "logs": logs,
        "symbols": settings.symbols,
    }


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    ctx = _context()
    ctx["request"] = request
    return templates.TemplateResponse("index.html", ctx)


@app.get("/api/status")
def api_status():
    return JSONResponse(_context())


@app.post("/api/run")
def api_run():
    from oracle.orchestration import run_session_once

    run_id = run_session_once(write_report=True)
    return {"ok": True, "run_id": run_id}


def create_app() -> FastAPI:
    return app
