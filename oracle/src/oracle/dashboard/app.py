"""Production-ready Toss-style Oracle dashboard."""

from __future__ import annotations

import os
import secrets
import uuid
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
from oracle.dashboard.jobs import JobStore, start_job
from oracle.data.calendar import calendar_as_dicts
from oracle.data.macro import macro_as_dict
from oracle.data.news import aggregate_market_headlines
from oracle.execution import ExecutionEngine, KillSwitch, estimate_day_pnl_pct, get_broker
from oracle.execution.alpaca import alpaca_configured
from oracle.llm.brain import brain_health
from oracle.orchestration import OraclePipeline
from oracle.portfolio.journal import JournalEntry, TradeJournal, now_iso
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
IMPORTANCE_KO = {"high": "높음", "medium": "보통", "low": "낮음"}
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


def _flash(path: str, msg: str) -> RedirectResponse:
    sep = "&" if "?" in path else "?"
    return RedirectResponse(url=f"{path}{sep}flash={quote(msg)}", status_code=303)


def _tone(action: str) -> str:
    if action in {"Buy", "Add"}:
        return "buy"
    if action in {"Sell", "Reduce"}:
        return "sell"
    return "hold"


def _risk_label(score: float) -> str:
    if score >= 0.7:
        return "위험"
    if score >= 0.4:
        return "주의"
    return "안정"


def _localize_macro(macro: dict) -> dict:
    notes_ko = []
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
    out = dict(macro)
    out["notes_ko"] = notes_ko
    out["levels_ko"] = [
        {"label": MACRO_LABEL_KO.get(k, k), "value": v}
        for k, v in (macro.get("levels") or {}).items()
    ]
    return out


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
    if not (
        secrets.compare_digest(credentials.username, user)
        and secrets.compare_digest(credentials.password, password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 정보가 올바르지 않습니다",
            headers={"WWW-Authenticate": "Basic"},
        )


JOB_LABELS = {
    "analyze": "시장 분석",
    "plan_trades": "매매 계획",
    "backtest": "백테스트",
}


def _latest_backtest_path() -> Path:
    settings = get_settings()
    return Path(settings.data_dir) / "latest_backtest.json"


def _save_latest_backtest(payload: dict) -> None:
    import json

    path = _latest_backtest_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_latest_backtest() -> dict | None:
    import json

    path = _latest_backtest_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "mode_ko" not in data:
            data["mode_ko"] = (
                "워크포워드" if data.get("mode") == "walk_forward" else "빠른 검증"
            )
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _job_view(job: dict) -> dict:
    import json

    payload: dict = {}
    raw = job.get("payload")
    if isinstance(raw, str) and raw:
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {}
    elif isinstance(raw, dict):
        payload = raw
    redirect = payload.get("redirect") or "/"
    # strip flash query from stored redirect when presenting a button target
    redirect_clean = redirect.split("?")[0] if isinstance(redirect, str) else "/"
    return {
        **job,
        "payload": payload,
        "redirect": redirect_clean,
        "error": payload.get("error") or (job.get("message") if job.get("status") == "error" else None),
        "label": JOB_LABELS.get(job.get("kind", ""), job.get("kind", "작업")),
        "backtest": payload.get("backtest"),
    }


def _broker_status() -> dict:
    live = os.getenv("ORACLE_LIVE_TRADING", "").strip().lower() in {"1", "true", "yes"}
    configured = alpaca_configured()
    account = None
    err = None
    mode = "local_paper"
    if configured:
        try:
            broker = get_broker()
            if broker is not None:
                account_obj = broker.get_account()
                account = {
                    "equity": account_obj.equity,
                    "cash": account_obj.cash,
                    "buying_power": account_obj.buying_power,
                    "day_pnl_pct": account_obj.day_pnl_pct,
                    "positions": account_obj.positions,
                }
                base = getattr(broker, "base_url", "")
                mode = "alpaca_live" if live and "paper" not in str(base) else "alpaca_paper"
        except Exception as exc:
            err = str(exc)
            mode = "alpaca_error"
    return {
        "configured": configured,
        "mode": mode,
        "mode_ko": {
            "local_paper": "로컬 페이퍼",
            "alpaca_paper": "Alpaca 페이퍼",
            "alpaca_live": "Alpaca 실계좌",
            "alpaca_error": "브로커 연결 오류",
        }.get(mode, mode),
        "live_flag": live,
        "account": account,
        "error": err,
        "ready_for_money": configured and mode == "alpaca_paper",
    }


def _context(
    *,
    active: str = "home",
    flash: str | None = None,
    backtest: dict | None = None,
) -> dict:
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    store = DecisionStore(Path(settings.data_dir) / "oracle.db")
    decisions_raw = store.recent_decisions(limit=50)
    journal = TradeJournal()
    planned = journal.list_recent(limit=30, status="planned")
    recent_journal = journal.list_recent(limit=30)
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    risk_score, _ = RiskManagerAgent().evaluate_portfolio(portfolio)
    equity = portfolio.equity()
    cost_basis = portfolio.cash + sum(p.shares * p.avg_cost for p in portfolio.positions)
    ret = (equity / cost_basis - 1.0) if cost_basis > 0 else 0.0

    latest_by_symbol: dict[str, dict] = {}
    for d in decisions_raw:
        latest_by_symbol.setdefault(d["symbol"], d)

    rows = []
    for p in portfolio.positions:
        d = latest_by_symbol.get(p.symbol)
        action = d["action"] if d else "Hold"
        rows.append(
            {
                "symbol": p.symbol,
                "shares": p.shares,
                "avg_cost": p.avg_cost,
                "price": p.market_price,
                "weight": portfolio.weight(p.symbol),
                "pnl_pct": p.unrealized_pnl_pct or 0.0,
                "value": p.market_value or 0.0,
                "action": action,
                "action_ko": ACTION_KO.get(action, action),
                "tone": _tone(action),
                "confidence": float(d["confidence"]) if d else None,
            }
        )
    rows.sort(key=lambda r: r["value"], reverse=True)

    decisions = [
        {
            **d,
            "action_ko": ACTION_KO.get(d["action"], d["action"]),
            "tone": _tone(d["action"]),
            "rationale_short": (d.get("rationale") or "").split("\n")[0][:140],
        }
        for d in decisions_raw
    ]
    actionable = []
    seen = set()
    for d in decisions:
        if d["action"] not in ACTIONABLE or d["symbol"] in seen:
            continue
        seen.add(d["symbol"])
        actionable.append(d)

    avg_conf = (
        sum(float(d.get("confidence") or 0) for d in decisions_raw) / len(decisions_raw)
        if decisions_raw
        else 0.0
    )

    headlines = []
    try:
        headlines = [
            {"title": h.title, "publisher": h.publisher, "link": h.link}
            for h in aggregate_market_headlines(settings.symbols[:5], per_symbol=2)[:8]
        ]
    except Exception:
        headlines = []

    macro = {"notes_ko": [], "levels_ko": []}
    try:
        macro = _localize_macro(macro_as_dict())
    except Exception:
        pass

    report_path = Path(settings.report_output_dir)
    if not report_path.is_absolute():
        report_path = Path.cwd() / report_path
    latest_report = ""
    latest_file = report_path / "latest.md"
    if latest_file.exists():
        latest_report = latest_file.read_text(encoding="utf-8", errors="ignore")[:1500]

    log_path = Path(settings.data_dir) / "logs" / "oracle.log"
    logs = (
        log_path.read_text(encoding="utf-8", errors="ignore").splitlines()[-40:]
        if log_path.exists()
        else []
    )

    if backtest is None:
        backtest = _load_latest_backtest()
    if backtest and "mode_ko" not in backtest:
        backtest = {
            **backtest,
            "mode_ko": "워크포워드" if backtest.get("mode") == "walk_forward" else "빠른 검증",
        }

    broker = _broker_status()
    return {
        "version": __version__,
        "active": active,
        "flash": flash,
        "equity": equity,
        "cash": portfolio.cash,
        "cash_pct": (portfolio.cash / equity) if equity else 0.0,
        "return_pct": ret,
        "day_pnl_pct": day_pnl,
        "positions": rows,
        "decisions": decisions[:30],
        "actionable": actionable[:10],
        "journal": [
            {**j, "action_ko": ACTION_KO.get(j["action"], j["action"]), "status_ko": STATUS_KO.get(j["status"], j["status"])}
            for j in recent_journal
        ],
        "planned": [
            {**j, "action_ko": ACTION_KO.get(j["action"], j["action"])} for j in planned
        ],
        "calendar": calendar_as_dicts(21),
        "macro": macro,
        "headlines": headlines,
        "avg_confidence": avg_conf,
        "risk_score": risk_score,
        "risk_label": _risk_label(risk_score),
        "kill_switch": ks.__dict__,
        "logs": logs,
        "symbols": settings.symbols,
        "backtest": backtest,
        "latest_report": latest_report,
        "action_ko": ACTION_KO,
        "status_ko": STATUS_KO,
        "importance_ko": IMPORTANCE_KO,
        "pending_count": len(planned),
        "actionable_count": len(actionable),
        "broker": broker,
        "live_trading": broker["live_flag"],
        "llm": brain_health(),
        "auth_enabled": bool(
            os.getenv("ORACLE_DASHBOARD_USER", "").strip()
            or os.getenv("ORACLE_DASHBOARD_PASSWORD", "").strip()
        ),
    }


def _render(request: Request, name: str, **kwargs):
    ctx = _context(**kwargs)
    return templates.TemplateResponse(request, name, ctx)


@app.get("/", response_class=HTMLResponse)
def home(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "home.html", active="home", flash=flash)


@app.get("/holdings", response_class=HTMLResponse)
def holdings(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "holdings.html", active="holdings", flash=flash)


@app.get("/trades", response_class=HTMLResponse)
def trades(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "trades.html", active="trades", flash=flash)


@app.get("/decisions", response_class=HTMLResponse)
def decisions(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "decisions.html", active="decisions", flash=flash)


@app.get("/settings", response_class=HTMLResponse)
def settings_page(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "settings.html", active="settings", flash=flash)


@app.get("/job/{job_id}", response_class=HTMLResponse)
def job_page(request: Request, job_id: str, _: None = Depends(require_auth)):
    raw = JobStore().get(job_id)
    if not raw:
        return _flash("/", "작업을 찾을 수 없습니다")
    job = _job_view(raw)
    return templates.TemplateResponse(
        request,
        "job.html",
        {
            **_context(active="home"),
            "job": job,
            "job_label": job["label"],
            "job_redirect": job["redirect"],
            "job_error": job["error"],
            "payload": job["payload"],
        },
    )


@app.get("/api/status")
def api_status(_: None = Depends(require_auth)):
    return JSONResponse(_context())


@app.get("/api/job/{job_id}")
def api_job(job_id: str, _: None = Depends(require_auth)):
    job = JobStore().get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    view = _job_view(job)
    # JSON-safe: drop nested backtest equity curves if huge — keep summary fields
    payload = dict(view.get("payload") or {})
    if "backtest" in payload and isinstance(payload["backtest"], dict):
        bt = dict(payload["backtest"])
        bt.pop("equity_curve", None)
        payload["backtest"] = bt
    return JSONResponse(
        {
            "id": view["id"],
            "kind": view["kind"],
            "status": view["status"],
            "message": view["message"],
            "label": view["label"],
            "redirect": view["redirect"],
            "error": view["error"],
            "payload": payload,
        }
    )


@app.post("/actions/run")
def actions_run(fast: str = Form("1"), _: None = Depends(require_auth)):
    settings = get_settings()
    symbols = settings.symbols[:6] if fast == "1" else settings.symbols

    def _work(_job_id: str):
        result = OraclePipeline(settings).run(session="ad_hoc", symbols=symbols)
        from oracle.reports import write_daily_report

        path = write_daily_report(result)
        return {
            "message": f"분석 완료 · {len(result.decisions)}종목",
            "run_id": result.run_id,
            "report": str(path),
            "redirect": "/",
        }

    job_id = start_job("analyze", _work, message="시장 분석 중…")
    return RedirectResponse(url=f"/job/{job_id}", status_code=303)


@app.post("/actions/plan_trades")
def plan_trades(_: None = Depends(require_auth)):
    settings = get_settings()

    def _work(_job_id: str):
        result = OraclePipeline(settings).run(session="ad_hoc", symbols=settings.symbols[:8])
        engine = ExecutionEngine(require_confirm=True)
        portfolio = load_portfolio(settings.portfolio_path)
        queued = 0
        for d in result.decisions:
            if d.action in (Action.HOLD, Action.DO_NOTHING):
                continue
            out = engine.execute_decision(d, portfolio=portfolio, confirm=False)
            if out.journal_id and not out.accepted:
                queued += 1
        return {
            "message": f"검토할 주문 {queued}건 준비됨",
            "queued": queued,
            "redirect": "/trades",
        }

    job_id = start_job("plan_trades", _work, message="주문 후보 생성 중…")
    return RedirectResponse(url=f"/job/{job_id}", status_code=303)


@app.post("/actions/approve")
def approve_trade(entry_id: int = Form(...), _: None = Depends(require_auth)):
    result = ExecutionEngine(require_confirm=False).confirm_journal_entry(entry_id)
    msg = "체결 완료" if result.accepted else f"실패 · {result.message}"
    return _flash("/trades", msg)


@app.post("/actions/reject")
def reject_trade(entry_id: int = Form(...), _: None = Depends(require_auth)):
    result = ExecutionEngine().reject_journal_entry(entry_id)
    return _flash("/trades", "주문을 거절했습니다" if result.accepted else result.message)


@app.post("/actions/approve_all")
def approve_all(_: None = Depends(require_auth)):
    engine = ExecutionEngine(require_confirm=False)
    planned = TradeJournal().list_recent(limit=100, status="planned")
    ok = fail = 0
    for row in planned:
        out = engine.confirm_journal_entry(int(row["id"]))
        if out.accepted:
            ok += 1
        else:
            fail += 1
    return _flash("/trades", f"승인 {ok}건 · 실패 {fail}건")


@app.post("/actions/practice_order")
def practice_order(_: None = Depends(require_auth)):
    """Create one tiny planned order so the approve UX can be verified (paper only)."""
    live = os.getenv("ORACLE_LIVE_TRADING", "").strip().lower() in {"1", "true", "yes"}
    if live:
        return _flash("/trades", "실거래 모드에서는 연습 주문을 만들 수 없습니다")
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    symbol = (settings.symbols[0] if settings.symbols else "SPY").upper()
    # Prefer a known liquid symbol for smoke tests
    symbol = "SPY"
    price = 100.0
    for p in portfolio.positions:
        if p.symbol == symbol and p.market_price:
            price = float(p.market_price)
            break
    jid = TradeJournal().add(
        JournalEntry(
            ts=now_iso(),
            symbol=symbol,
            action="Buy",
            shares=1.0,
            price=price,
            rationale="연습 주문 — 승인 버튼·체결 경로 확인용 (모의)",
            status="planned",
            client_order_id=f"practice-{uuid.uuid4().hex[:10]}",
        )
    )
    return _flash("/trades", f"연습 주문 #{jid} 준비됨 · 승인하면 모의 체결됩니다")


@app.post("/actions/kill")
def set_kill(active: str = Form(...), _: None = Depends(require_auth)):
    ks = KillSwitch()
    if active == "1":
        ks.engage()
        return _flash("/settings", "긴급 정지 켜짐 · 신규 매수 차단")
    ks.release()
    return _flash("/settings", "긴급 정지 해제됨")


@app.post("/actions/backtest")
def run_bt(
    request: Request,
    symbol: str = Form("SPY"),
    mode: str = Form("oracle_lite"),
    _: None = Depends(require_auth),
):
    symbol = (symbol or "SPY").upper().strip()
    settings = get_settings()

    def _work(_job_id: str):
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
            }
            _save_latest_backtest(backtest)
            return {
                "message": f"{symbol} 워크포워드 완료",
                "redirect": "/decisions",
                "backtest": backtest,
            }
        bt = run_oracle_lite_backtest(
            symbol,
            commission_bps=settings.commission_bps,
            slippage_bps=settings.slippage_bps,
        )
        backtest = {
            "mode": "oracle_lite",
            "mode_ko": "빠른 검증",
            "symbol": symbol,
            "oos_return": bt.total_return,
            "oos_sharpe": bt.sharpe,
            "oos_mdd": bt.max_drawdown,
            "benchmark": None,
            "excess": None,
            "folds": None,
            "report": None,
            "cagr": bt.cagr,
            "win_rate": bt.win_rate,
        }
        _save_latest_backtest(backtest)
        return {
            "message": f"{symbol} 백테스트 완료",
            "redirect": "/decisions",
            "backtest": backtest,
        }

    job_id = start_job("backtest", _work, message=f"{symbol} 백테스트 중…")
    return RedirectResponse(url=f"/job/{job_id}", status_code=303)


@app.post("/api/run")
def api_run(_: None = Depends(require_auth)):
    # keep compatibility: sync mini-run
    from oracle.orchestration import run_session_once

    run_id = run_session_once(write_report=True)
    return {"ok": True, "run_id": run_id}


def create_app() -> FastAPI:
    return app
