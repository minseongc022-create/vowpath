"""FastAPI operator dashboard — Toss-style Korean UX."""

from __future__ import annotations

import os
import secrets
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, Form, HTTPException, Request, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from oracle import __version__
from oracle.agents.risk_manager import RiskManagerAgent
from oracle.backtest import run_oracle_lite_backtest, run_walk_forward, write_walk_forward_report
from oracle.config import get_settings
from oracle.core.types import Action
from oracle.data.calendar import calendar_as_dicts
from oracle.data.macro import macro_as_dict
from oracle.data.news import aggregate_market_headlines
from oracle.execution import ExecutionEngine, KillSwitch, estimate_day_pnl_pct
from oracle.orchestration import OraclePipeline
from oracle.portfolio.journal import TradeJournal
from oracle.portfolio.store import DecisionStore, load_portfolio

APP_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(APP_DIR / "templates"))
security = HTTPBasic(auto_error=False)

app = FastAPI(title="프로젝트 오라클", version=__version__)
static_dir = APP_DIR / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

ACTION_KO = {
    "Buy": "매수",
    "Add": "추가매수",
    "Hold": "보유",
    "Reduce": "축소",
    "Sell": "매도",
    "Do Nothing": "관망",
}
STATUS_KO = {
    "planned": "대기",
    "filled": "체결",
    "cancelled": "취소",
    "rejected": "거부",
}
IMPORTANCE_KO = {
    "high": "높음",
    "medium": "보통",
    "low": "낮음",
}
MACRO_LABEL_KO = {
    "us_10y": "미 10년물",
    "us_2y": "단기금리",
    "dxy": "달러지수",
    "eurusd": "유로/달러",
    "usdjpy": "달러/엔",
    "wti": "원유",
    "gold": "금",
    "copper": "구리",
    "vix": "공포지수",
    "hy_spread_proxy": "하이일드",
}
ACTIONABLE = {"Buy", "Add", "Reduce", "Sell"}


def _flash_url(msg: str) -> str:
    return f"/?flash={quote(msg)}"


def _localize_macro(macro: dict) -> dict:
    notes_ko: list[str] = []
    for note in macro.get("notes") or []:
        text = note
        text = text.replace(
            "FRED_API_KEY not set — using market proxies only",
            "공식 매크로 API 없음 · 시장 지표로 대체 중",
        )
        text = text.replace("VIX elevated at", "공포지수 높음")
        text = text.replace("— risk-off bias", " · 위험회피 분위기")
        text = text.replace("VIX subdued at", "공포지수 낮음")
        text = text.replace("— complacency risk", " · 과한 낙관 주의")
        text = text.replace("10Y yield day move", "10년물 금리 변동")
        text = text.replace("— rates volatility", " · 금리 흔들림")
        text = text.replace(
            "USD firming (DXY up) — pressure on risk assets / EM",
            "달러 강세 · 위험자산에 부담",
        )
        notes_ko.append(text)
    levels_ko = [
        {"label": MACRO_LABEL_KO.get(k, k), "value": v}
        for k, v in (macro.get("levels") or {}).items()
    ]
    out = dict(macro)
    out["notes_ko"] = notes_ko
    out["levels_ko"] = levels_ko
    return out


def _risk_label(score: float) -> str:
    if score >= 0.7:
        return "위험"
    if score >= 0.4:
        return "주의"
    return "안정"


def _action_tone(action: str) -> str:
    if action in {"Buy", "Add"}:
        return "buy"
    if action in {"Sell", "Reduce"}:
        return "sell"
    return "hold"


def require_auth(
    credentials: HTTPBasicCredentials | None = Depends(security),
) -> None:
    user = os.getenv("ORACLE_DASHBOARD_USER", "").strip()
    password = os.getenv("ORACLE_DASHBOARD_PASSWORD", "").strip()
    if not user and not password:
        return
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
            headers={"WWW-Authenticate": "Basic"},
        )
    ok_user = secrets.compare_digest(credentials.username, user)
    ok_pass = secrets.compare_digest(credentials.password, password)
    if not (ok_user and ok_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Basic"},
        )


def _context(backtest: dict | None = None, flash: str | None = None) -> dict:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    store = DecisionStore(Path(settings.data_dir) / "oracle.db")
    decisions = store.recent_decisions(limit=40)
    journal = TradeJournal()
    planned = journal.list_recent(limit=20, status="planned")
    recent_journal = journal.list_recent(limit=20)
    headlines = aggregate_market_headlines(settings.symbols[:6], per_symbol=2)
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    risk_score, _ = RiskManagerAgent().evaluate_portfolio(portfolio)
    equity = portfolio.equity()
    cost_basis = portfolio.cash + sum(p.shares * p.avg_cost for p in portfolio.positions)
    ret = (equity / cost_basis - 1.0) if cost_basis > 0 else 0.0

    # latest decision per symbol
    latest_by_symbol: dict[str, dict] = {}
    for d in decisions:
        sym = d["symbol"]
        if sym not in latest_by_symbol:
            latest_by_symbol[sym] = d

    rows = []
    for p in portfolio.positions:
        d = latest_by_symbol.get(p.symbol)
        rows.append(
            {
                "symbol": p.symbol,
                "shares": p.shares,
                "avg_cost": p.avg_cost,
                "price": p.market_price,
                "weight": portfolio.weight(p.symbol),
                "pnl_pct": p.unrealized_pnl_pct or 0.0,
                "value": p.market_value or 0.0,
                "action": d["action"] if d else "Hold",
                "action_ko": ACTION_KO.get(d["action"], d["action"]) if d else "보유",
                "tone": _action_tone(d["action"] if d else "Hold"),
                "confidence": float(d["confidence"]) if d else None,
            }
        )
    rows.sort(key=lambda r: r["value"], reverse=True)

    actionable = [
        {
            **d,
            "action_ko": ACTION_KO.get(d["action"], d["action"]),
            "tone": _action_tone(d["action"]),
            "rationale_short": (d.get("rationale") or "").split("\n")[0][:120],
        }
        for d in decisions
        if d.get("action") in ACTIONABLE
    ][:8]

    # dedupe actionable by symbol keeping first
    seen = set()
    actionable_unique = []
    for a in actionable:
        if a["symbol"] in seen:
            continue
        seen.add(a["symbol"])
        actionable_unique.append(a)

    avg_conf = (
        sum(float(d.get("confidence") or 0) for d in decisions) / len(decisions) if decisions else 0.0
    )
    log_path = Path(settings.data_dir) / "logs" / "oracle.log"
    logs = log_path.read_text(encoding="utf-8", errors="ignore").splitlines()[-30:] if log_path.exists() else []

    report_path = Path(settings.report_output_dir) / "latest.md"
    latest_report = ""
    if report_path.exists():
        latest_report = report_path.read_text(encoding="utf-8", errors="ignore")[:1200]

    if backtest and "mode_ko" not in backtest:
        backtest = {
            **backtest,
            "mode_ko": "워크포워드" if backtest.get("mode") == "walk_forward" else "오라클 라이트",
        }

    return {
        "version": __version__,
        "equity": equity,
        "cash": portfolio.cash,
        "cash_pct": (portfolio.cash / equity) if equity else 0.0,
        "return_pct": ret,
        "day_pnl_pct": day_pnl,
        "positions": rows,
        "decisions": [
            {
                **d,
                "action_ko": ACTION_KO.get(d["action"], d["action"]),
                "tone": _action_tone(d["action"]),
            }
            for d in decisions[:20]
        ],
        "actionable": actionable_unique,
        "journal": recent_journal,
        "planned": planned,
        "calendar": calendar_as_dicts(21),
        "macro": _localize_macro(macro_as_dict()),
        "headlines": [
            {"title": h.title, "publisher": h.publisher, "link": h.link} for h in headlines[:8]
        ],
        "avg_confidence": avg_conf,
        "risk_score": risk_score,
        "risk_label": _risk_label(risk_score),
        "kill_switch": {
            "active": ks.active,
            "reason": ks.reason,
            "max_daily_loss_pct": ks.max_daily_loss_pct,
            "day_pnl_pct": ks.day_pnl_pct,
        },
        "logs": logs,
        "symbols": settings.symbols,
        "backtest": backtest,
        "flash": flash,
        "latest_report": latest_report,
        "auth_enabled": bool(
            os.getenv("ORACLE_DASHBOARD_USER", "").strip()
            or os.getenv("ORACLE_DASHBOARD_PASSWORD", "").strip()
        ),
        "action_ko": ACTION_KO,
        "status_ko": STATUS_KO,
        "importance_ko": IMPORTANCE_KO,
        "pending_count": len(planned),
        "actionable_count": len(actionable_unique),
    }


@app.get("/", response_class=HTMLResponse)
def home(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return templates.TemplateResponse(request, "index.html", _context(flash=flash))


@app.get("/api/status")
def api_status(_: None = Depends(require_auth)):
    return JSONResponse(_context())


@app.post("/api/run")
def api_run(_: None = Depends(require_auth)):
    from oracle.orchestration import run_session_once

    run_id = run_session_once(write_report=True)
    return {"ok": True, "run_id": run_id}


@app.post("/actions/run")
def actions_run(_: None = Depends(require_auth)):
    from oracle.orchestration import run_session_once

    run_id = run_session_once(write_report=True)
    return RedirectResponse(url=_flash_url(f"분석 완료 · {run_id}"), status_code=303)


@app.post("/actions/approve")
def approve_trade(entry_id: int = Form(...), _: None = Depends(require_auth)):
    result = ExecutionEngine(require_confirm=False).confirm_journal_entry(entry_id)
    return RedirectResponse(url=_flash_url(result.message), status_code=303)


@app.post("/actions/reject")
def reject_trade(entry_id: int = Form(...), _: None = Depends(require_auth)):
    result = ExecutionEngine().reject_journal_entry(entry_id)
    return RedirectResponse(url=_flash_url(result.message), status_code=303)


@app.post("/actions/approve_all")
def approve_all(_: None = Depends(require_auth)):
    engine = ExecutionEngine(require_confirm=False)
    planned = TradeJournal().list_recent(limit=50, status="planned")
    ok = 0
    for row in planned:
        out = engine.confirm_journal_entry(int(row["id"]))
        if out.accepted:
            ok += 1
    return RedirectResponse(url=_flash_url(f"대기 주문 {ok}건 승인 완료"), status_code=303)


@app.post("/actions/plan_trades")
def plan_trades(_: None = Depends(require_auth)):
    """Run pipeline and queue actionable decisions as planned journal entries."""
    settings = get_settings()
    result = OraclePipeline(settings).run(session="ad_hoc")
    engine = ExecutionEngine(require_confirm=True)
    portfolio = load_portfolio(settings.portfolio_path)
    queued = 0
    for d in result.decisions:
        if d.action in (Action.HOLD, Action.DO_NOTHING):
            continue
        out = engine.execute_decision(d, portfolio=portfolio, confirm=False)
        if out.journal_id and not out.accepted:
            queued += 1
    return RedirectResponse(url=_flash_url(f"검토할 주문 {queued}건을 만들었습니다"), status_code=303)


@app.post("/actions/kill")
def set_kill(active: str = Form(...), _: None = Depends(require_auth)):
    ks = KillSwitch()
    if active == "1":
        ks.engage()
        msg = "긴급 정지 켜짐 · 신규 매수 차단"
    else:
        ks.release()
        msg = "긴급 정지 해제됨"
    return RedirectResponse(url=_flash_url(msg), status_code=303)


@app.post("/actions/backtest")
def run_bt(
    request: Request,
    symbol: str = Form("SPY"),
    mode: str = Form("oracle_lite"),
    _: None = Depends(require_auth),
):
    symbol = symbol.upper().strip() or "SPY"
    settings = get_settings()
    if mode == "walk_forward":
        wf = run_walk_forward(
            symbol,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
        path = write_walk_forward_report(wf)
        backtest = {
            "mode": "walk_forward",
            "mode_ko": "워크포워드",
            "symbol": symbol,
            "oos_return": wf.oos_total_return,
            "oos_sharpe": wf.oos_sharpe,
            "oos_mdd": wf.oos_max_drawdown,
            "benchmark": wf.benchmark_total_return,
            "excess": wf.excess_return,
            "folds": wf.n_folds,
            "report": path,
            "equity_curve": wf.equity_curve,
        }
    else:
        bt = run_oracle_lite_backtest(
            symbol,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
        backtest = {
            "mode": "oracle_lite",
            "mode_ko": "오라클 라이트",
            "symbol": symbol,
            "oos_return": bt.total_return,
            "oos_sharpe": bt.sharpe,
            "oos_mdd": bt.max_drawdown,
            "benchmark": None,
            "excess": None,
            "folds": None,
            "report": None,
            "equity_curve": bt.equity_curve,
            "cagr": bt.cagr,
            "win_rate": bt.win_rate,
        }
    return templates.TemplateResponse(
        request,
        "index.html",
        _context(backtest=backtest, flash=f"{symbol} 백테스트 완료"),
    )


def create_app() -> FastAPI:
    return app
