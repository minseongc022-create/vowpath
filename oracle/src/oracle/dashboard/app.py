"""Production-ready Toss-style Oracle dashboard."""

from __future__ import annotations

import os
import secrets
import uuid
from datetime import UTC, datetime
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
from oracle.dashboard.cache import clear as cache_clear
from oracle.dashboard.cache import get_or_set
from oracle.dashboard.jobs import JobStore, start_job
from oracle.data.calendar import calendar_as_dicts
from oracle.data.macro import macro_as_dict
from oracle.data.news import aggregate_market_headlines
from oracle.execution import ExecutionEngine, KillSwitch, estimate_day_pnl_pct, get_broker
from oracle.execution.alpaca import PAPER_URL, LIVE_URL, AlpacaBroker, alpaca_configured
from oracle.execution.autopilot import enabled as autopilot_enabled
from oracle.execution.autopilot import set_enabled as autopilot_set
from oracle.execution.autopilot import start_background as autopilot_start
from oracle.execution.autopilot import status as autopilot_status
from oracle.execution.autopilot import run_once as autopilot_run_once
from oracle.execution.live_setup import (
    capital_plan,
    first_trade_notional,
    goal_progress,
    live_armed,
    live_max_notional,
    set_capital_plan,
    set_goal,
    set_goal_equity,
    sleeve_equity,
    upsert_env,
)
from oracle.execution.sync import sync_portfolio_from_broker
from oracle.data.fx import fx_snapshot
from oracle.llm.brain import brain_health
from oracle.orchestration import OraclePipeline
from oracle.portfolio.activity_log import ActivityLog, format_clock
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
    "submitted": "접수(장중체결)",
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
    hash_part = ""
    if "#" in path:
        path, hash_part = path.split("#", 1)
        hash_part = "#" + hash_part
    sep = "&" if "?" in path else "?"
    return RedirectResponse(url=f"{path}{sep}flash={quote(msg)}{hash_part}", status_code=303)


def _charge_url() -> str:
    if live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", "paper"):
        return "https://app.alpaca.markets/brokerage/dashboard/overview"
    return "https://app.alpaca.markets/paper/dashboard/overview"


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
    logs = payload.get("logs") if isinstance(payload.get("logs"), list) else []
    return {
        **job,
        "payload": payload,
        "logs": logs,
        "redirect": redirect_clean,
        "error": payload.get("error") or (job.get("message") if job.get("status") == "error" else None),
        "label": JOB_LABELS.get(job.get("kind", ""), job.get("kind", "작업")),
        "backtest": payload.get("backtest"),
    }


def _broker_status(*, probe: bool = True) -> dict:
    def _build(do_probe: bool) -> dict:
        live = live_armed()
        configured = alpaca_configured()
        account = None
        account_status = None
        err = None
        mode = "local_paper"
        base_url = os.getenv("ALPACA_BASE_URL", PAPER_URL)
        if configured and do_probe:
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
                    account_status = getattr(account_obj, "status", None)
                    if not account_status and hasattr(broker, "raw_account_status"):
                        account_status = broker.raw_account_status()
                    base = getattr(broker, "base_url", base_url)
                    mode = "alpaca_live" if live and "paper" not in str(base) else "alpaca_paper"
                    if "paper" not in str(base) and not live:
                        mode = "alpaca_live_unarmed"
            except Exception as exc:
                err = str(exc)
                mode = "alpaca_error"
        elif configured:
            if "paper" not in base_url:
                mode = "alpaca_live" if live else "alpaca_live_unarmed"
            else:
                mode = "alpaca_paper"
        return {
            "configured": configured,
            "mode": mode,
            "mode_ko": {
                "local_paper": "로컬 페이퍼",
                "alpaca_paper": "Alpaca 페이퍼",
                "alpaca_live": "Alpaca 실계좌",
                "alpaca_live_unarmed": "실계좌 URL · 무장 해제",
                "alpaca_error": "브로커 연결 오류",
            }.get(mode, mode),
            "live_flag": live,
            "account": account,
            "account_status": account_status,
            "unfunded": bool(account and float(account.get("equity") or 0) < 5),
            "error": err,
            "ready_for_money": configured and mode in {"alpaca_paper", "alpaca_live"},
            "max_notional": live_max_notional(),
            "first_notional": first_trade_notional(),
            "base_url": base_url,
        }

    if not probe:
        return _build(False)
    return get_or_set("broker_status", 20.0, lambda: _build(True))


def _maybe_sync_portfolio():
    """Keep local YAML in sync with Alpaca so holdings match reality."""

    def _sync():
        broker = get_broker()
        if broker is None:
            raise RuntimeError("broker not configured")
        return sync_portfolio_from_broker(broker)

    try:
        return get_or_set("portfolio_broker_sync", 45.0, _sync)
    except Exception:
        return None


def _context(
    *,
    active: str = "home",
    flash: str | None = None,
    backtest: dict | None = None,
    light: bool = False,
    watch_job_id: str | None = None,
    chart_symbol: str | None = None,
    chart_symbols: list | None = None,
) -> dict:
    settings = get_settings()
    # Money / AI pages: pull real broker holdings so UI isn't empty while Alpaca has positions
    if active in {"money", "home", "ai", "activity"}:
        synced = _maybe_sync_portfolio()
        portfolio = synced if synced is not None else load_portfolio(settings.portfolio_path)
    else:
        portfolio = load_portfolio(settings.portfolio_path)
    store = DecisionStore(Path(settings.data_dir) / "oracle.db")
    decisions_raw = store.recent_decisions(limit=20 if light else 50)
    journal = TradeJournal()
    planned = journal.list_recent(limit=20 if light else 30, status="planned")
    # Prefer real fills for "최근 체결"; fall back to non-planned if none
    recent_journal = [
        j
        for j in journal.list_recent(limit=40)
        if j.get("status") in {"filled", "submitted"}
    ][: (15 if light else 30)]
    if not recent_journal:
        recent_journal = [
            j for j in journal.list_recent(limit=15 if light else 30) if j.get("status") != "planned"
        ]
    day_pnl = estimate_day_pnl_pct(portfolio)
    ks = KillSwitch().check(day_pnl)
    # Risk eval is CPU-light; keep it
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

    headlines: list = []
    macro = {"notes_ko": [], "levels_ko": []}
    latest_report = ""
    logs: list = []
    calendar = []
    if not light and active in {"home", "decisions"}:
        def _headlines():
            try:
                return [
                    {"title": h.title, "publisher": h.publisher, "link": h.link}
                    for h in aggregate_market_headlines(settings.symbols[:4], per_symbol=1)[:6]
                ]
            except Exception:
                return []

        headlines = get_or_set("headlines", 180.0, _headlines)

        def _macro():
            try:
                return _localize_macro(macro_as_dict())
            except Exception:
                return {"notes_ko": [], "levels_ko": []}

        macro = get_or_set("macro", 300.0, _macro)
        calendar = calendar_as_dicts(14)

    if not light and active == "decisions":
        report_path = Path(settings.report_output_dir)
        if not report_path.is_absolute():
            report_path = Path.cwd() / report_path
        latest_file = report_path / "latest.md"
        if latest_file.exists():
            latest_report = latest_file.read_text(encoding="utf-8", errors="ignore")[:1200]
        if backtest is None:
            backtest = _load_latest_backtest()

    if backtest and "mode_ko" not in backtest:
        backtest = {
            **backtest,
            "mode_ko": "워크포워드" if backtest.get("mode") == "walk_forward" else "빠른 검증",
        }

    # Probe broker on money/settings pages for cash/charge accuracy
    broker = _broker_status(probe=(active in {"settings", "money", "home"} and not light))
    llm = get_or_set("llm_health", 30.0, brain_health)
    fx = get_or_set("fx_usdkrw", 300.0, fx_snapshot)
    plan = capital_plan(portfolio, cash=float(portfolio.cash))
    sleeve = sleeve_equity(portfolio)
    goal = goal_progress(equity, sleeve=sleeve)
    # Without a seed sleeve, full-account goal % is misleading (e.g. $100k / $1.1M = 9%)
    goal_display = dict(goal)
    if goal.get("set") and not plan.get("set"):
        goal_display = {
            **goal,
            "pct": 0.0,
            "stake": None,
            "label": "AI 한도·목표·기간 미설정 · 아래에서 저장하세요",
            "misleading": True,
        }
    # Suggest budget/goal (from account cash — not a separate "deposit" field)
    if plan.get("budget"):
        suggested_budget = int(plan["budget"])
    else:
        suggested_budget = min(100, max(10, int(min(portfolio.cash, equity) * 0.01) or 10))
    if goal["set"] and not goal["reached"] and plan.get("set"):
        suggested_goal = int(goal["goal"])
    elif goal["set"] and not plan.get("set") and float(goal.get("goal") or 0) > equity * 1.2:
        suggested_goal = max(int(suggested_budget * 2), suggested_budget + 20, 50)
    elif goal["set"] and not goal["reached"]:
        suggested_goal = int(goal["goal"])
    else:
        suggested_goal = max(int(suggested_budget * 2), suggested_budget + 20, 50)

    return {
        "version": __version__,
        "active": active,
        "flash": flash,
        "equity": equity,
        "cash": portfolio.cash,
        "cash_pct": (portfolio.cash / equity) if equity else 0.0,
        "return_pct": ret,
        "day_pnl_pct": day_pnl,
        "goal": goal_display,
        "goal_raw": goal,
        "capital": plan,
        "suggested_budget": suggested_budget,
        "suggested_goal": suggested_goal,
        "mission_ready": bool(plan.get("set") and goal.get("set")),
        "fx": fx,
        "charge_url": _charge_url(),
        "positions": rows,
        "decisions": decisions[:30],
        "actionable": actionable[:10],
        "journal": [
            {
                **j,
                "action_ko": ACTION_KO.get(j["action"], j["action"]),
                "status_ko": STATUS_KO.get(j["status"], j["status"]),
                "clock": format_clock(j.get("ts"), with_date=True),
            }
            for j in recent_journal
        ],
        "activity_feed": ActivityLog().recent(limit=60),
        "planned": [
            {**j, "action_ko": ACTION_KO.get(j["action"], j["action"])} for j in planned
        ],
        "calendar": calendar,
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
        "llm": llm,
        "autopilot": (_ap := autopilot_status()).__dict__,
        "buffett_principles": __import__(
            "oracle.investing.buffett", fromlist=["principles_as_dicts"]
        ).principles_as_dicts(),
        "buffett_desk": (_ap.buffett or {}),
        "watch_job_id": watch_job_id,
        "chart_symbol": chart_symbol or "SPY",
        "chart_symbols": chart_symbols or ["SPY"],
        "scroll_to": None,
        "auth_enabled": bool(
            os.getenv("ORACLE_DASHBOARD_USER", "").strip()
            or os.getenv("ORACLE_DASHBOARD_PASSWORD", "").strip()
        ),
    }


def _render(request: Request, name: str, **kwargs):
    context_keys = {
        "active",
        "flash",
        "backtest",
        "light",
        "watch_job_id",
        "chart_symbol",
        "chart_symbols",
    }
    ctx_kwargs = {k: kwargs.pop(k) for k in list(kwargs) if k in context_keys}
    ctx = _context(**ctx_kwargs)
    ctx.update(kwargs)
    return templates.TemplateResponse(request, name, ctx)


@app.get("/", response_class=HTMLResponse)
def home(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "home.html", active="money", flash=flash, light=False)


@app.get("/ai", response_class=HTMLResponse)
def ai_page(
    request: Request,
    flash: str | None = None,
    watch: str | None = None,
    _: None = Depends(require_auth),
):
    return _render(
        request,
        "ai.html",
        active="ai",
        flash=flash,
        light=True,
        watch_job_id=(watch or "").strip() or None,
    )


@app.get("/activity", response_class=HTMLResponse)
def activity_page(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    journal = TradeJournal().list_recent(limit=40)
    chart_symbols: list[str] = []
    for row in journal:
        sym = str(row.get("symbol") or "").upper()
        if sym and sym not in chart_symbols:
            chart_symbols.append(sym)
        if len(chart_symbols) >= 6:
            break
    if "SPY" not in chart_symbols:
        chart_symbols.append("SPY")
    return _render(
        request,
        "activity.html",
        active="activity",
        flash=flash,
        light=True,
        chart_symbol=chart_symbols[0] if chart_symbols else "SPY",
        chart_symbols=chart_symbols,
    )


@app.get("/api/chart/{symbol}")
def api_chart(symbol: str, days: int = 60, _: None = Depends(require_auth)):
    from oracle.data.market import fetch_history

    symbol = symbol.upper().strip()
    days = max(20, min(int(days or 60), 180))
    try:
        hist = fetch_history(symbol, days=days)
        closes = hist["close"].dropna()
    except Exception as exc:
        raise HTTPException(404, f"chart unavailable: {exc}") from exc
    labels = [str(i.date()) if hasattr(i, "date") else str(i)[:10] for i in closes.index]
    prices = [round(float(x), 4) for x in closes.tolist()]
    buy_points = [None] * len(labels)
    sell_points = [None] * len(labels)
    label_idx = {lab: i for i, lab in enumerate(labels)}
    for row in TradeJournal().list_recent(limit=80):
        if str(row.get("symbol") or "").upper() != symbol:
            continue
        if row.get("status") not in {"filled", "submitted"}:
            continue
        ts = str(row.get("ts") or "")[:10]
        idx = label_idx.get(ts)
        if idx is None and labels:
            # snap to nearest last bar if trade date outside window
            idx = len(labels) - 1
        if idx is None:
            continue
        px = float(row.get("price") or prices[idx] or 0)
        action = str(row.get("action") or "")
        if action in {"Buy", "Add"}:
            buy_points[idx] = px
        elif action in {"Sell", "Reduce"}:
            sell_points[idx] = px
    return JSONResponse(
        {
            "symbol": symbol,
            "labels": labels,
            "prices": prices,
            "buy_points": buy_points,
            "sell_points": sell_points,
        }
    )


@app.get("/api/activity/flow")
def api_activity_flow(_: None = Depends(require_auth)):
    rows = list(reversed(TradeJournal().list_recent(limit=30)))
    labels: list[str] = []
    values: list[float] = []
    for row in rows:
        if row.get("status") not in {"filled", "submitted"}:
            continue
        action = str(row.get("action") or "")
        notional = abs(float(row.get("shares") or 0) * float(row.get("price") or 0))
        if notional <= 0:
            continue
        labels.append(f"{str(row.get('symbol'))} {str(row.get('ts') or '')[5:10]}")
        values.append(notional if action in {"Buy", "Add"} else -notional)
    return JSONResponse({"labels": labels[-20:], "values": values[-20:]})


@app.get("/holdings", response_class=HTMLResponse)
def holdings_redirect():
    return RedirectResponse(url="/", status_code=303)


@app.get("/trades", response_class=HTMLResponse)
def trades_redirect(watch: str | None = None):
    q = f"?watch={watch}" if watch else ""
    return RedirectResponse(url=f"/ai{q}", status_code=303)


@app.get("/decisions", response_class=HTMLResponse)
def decisions_redirect():
    return RedirectResponse(url="/ai", status_code=303)


@app.get("/settings", response_class=HTMLResponse)
def settings_page(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    return _render(request, "settings.html", active="settings", flash=flash, light=False)


@app.get("/blog", response_class=HTMLResponse)
def blog_page(request: Request, flash: str | None = None, _: None = Depends(require_auth)):
    from oracle.content_blog import store as blog_store

    return _render(
        request,
        "blog.html",
        active="blog",
        flash=flash,
        light=True,
        blog_inbox=blog_store.load_inbox(),
        blog_job=blog_store.load_job(),
        blog_connections=blog_store.load_connections(),
        blog_settings=blog_store.load_settings(),
    )


@app.post("/actions/blog_generate")
def blog_generate(_: None = Depends(require_auth)):
    from oracle.content_blog.engine import generate_all

    job = generate_all(live=True)
    if job.get("status") == "done":
        n = len(job.get("results") or [])
        published = sum(1 for r in (job.get("results") or []) if r.get("published"))
        return _flash(
            "/blog",
            f"{n}편 완료 · 자동발행 {published} · SNS 문구는 아래에서 복사",
        )
    return _flash("/blog", f"생성 실패: {job.get('error', 'unknown')}")


@app.get("/api/blog/cover/{name}")
def api_blog_cover(name: str, _: None = Depends(require_auth)):
    from fastapi.responses import FileResponse

    from oracle.content_blog import store as blog_store

    # prevent path traversal
    safe = Path(name).name
    if not safe.endswith(".svg") or ".." in name or "/" in name or "\\" in name:
        raise HTTPException(status_code=404, detail="Not Found")
    path = blog_store._root() / "covers" / safe  # noqa: SLF001
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(path, media_type="image/svg+xml")


@app.post("/actions/blog_connect")
def blog_connect(
    platform: str = Form(...),
    naver_id: str = Form(""),
    site_url: str = Form(""),
    username: str = Form(""),
    app_password: str = Form(""),
    blog_id: str = Form(""),
    access_token: str = Form(""),
    _: None = Depends(require_auth),
):
    from oracle.content_blog import store as blog_store

    cur = blog_store.load_connections()
    now = blog_store.now_iso()
    if platform == "naver":
        nid = naver_id.strip()
        cur["naver"] = {
            "blogId": nid,
            "blogUrl": f"https://blog.naver.com/{nid}" if nid else "",
            "connectedAt": now,
        }
    elif platform == "wordpress":
        cur["wordpress"] = {
            "baseUrl": site_url.strip().rstrip("/"),
            "username": username.strip(),
            "appPassword": app_password.strip(),
            "connectedAt": now,
        }
    elif platform == "blogger":
        cur["blogger"] = {
            "blogId": blog_id.strip(),
            "accessToken": access_token.strip(),
            "connectedAt": now,
        }
    else:
        return _flash("/blog", "알 수 없는 플랫폼")
    blog_store.save_connections(cur)
    return _flash("/blog", f"{platform} 연결 저장됨")


@app.post("/actions/blog_settings")
def blog_settings(
    ntfy_topic: str = Form(""),
    _: None = Depends(require_auth),
):
    from oracle.content_blog import store as blog_store

    blog_store.save_settings({"ntfy_topic": ntfy_topic.strip()})
    return _flash("/blog", "알림 설정 저장됨")


@app.get("/api/blog/status")
def api_blog_status(_: None = Depends(require_auth)):
    from oracle.content_blog import store as blog_store

    return {
        "inbox": blog_store.load_inbox(),
        "job": blog_store.load_job(),
        "connections": blog_store.load_connections(),
        "settings": blog_store.load_settings(),
    }


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


@app.get("/api/fx")
def api_fx(_: None = Depends(require_auth)):
    return JSONResponse(get_or_set("fx_usdkrw", 300.0, fx_snapshot))


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
    logs = view.get("logs") or payload.get("logs") or []
    return JSONResponse(
        {
            "id": view["id"],
            "kind": view["kind"],
            "status": view["status"],
            "message": view["message"],
            "label": view["label"],
            "redirect": view["redirect"],
            "error": view["error"],
            "logs": logs,
            "payload": payload,
        }
    )


@app.get("/api/autopilot")
def api_autopilot(_: None = Depends(require_auth)):
    """Realtime 24h monitor payload for the AI page live window."""
    st = autopilot_status()
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
    plan = capital_plan(portfolio, cash=float(portfolio.cash))
    sleeve = sleeve_equity(portfolio)
    gprog = goal_progress(float(portfolio.equity()), sleeve=sleeve)
    from oracle.execution.autopilot import us_equity_session

    sess = us_equity_session()
    stage = st.stage or ("analyzing" if st.busy else ("watching" if st.enabled else "stopped"))
    stage_ko = st.stage_ko or {
        "analyzing": "분석중",
        "investing": "투자중",
        "preparing": "준비중",
        "watching": "대기중",
        "stopped": "정지",
    }.get(stage, stage)
    situation = st.situation or st.last_message or stage_ko
    news = st.news or {}
    return JSONResponse(
        {
            "enabled": st.enabled,
            "running": st.running,
            "busy": st.busy,
            "interval_sec": st.interval_sec,
            "last_ts": st.last_ts,
            "last_clock": format_clock(st.last_ts, with_date=True),
            "last_message": st.last_message,
            "last_ok": st.last_ok,
            "last_action": st.last_action,
            "picks": st.picks[:10],
            "picks_ts": st.picks_ts,
            "picks_clock": format_clock(st.picks_ts, with_date=True),
            "logs": st.logs[-60:],
            "cycle": st.cycle,
            "stage": stage,
            "stage_ko": stage_ko,
            "situation": situation,
            "phase": stage,
            "phase_ko": stage_ko,
            "prep_mode": bool(st.prep_mode or not sess.get("open")),
            "watchlist": list(st.watchlist or [])[:10],
            "buffett": st.buffett or {},
            "news": news,
            "mode": gprog.get("mode"),
            "mode_ko": gprog.get("mode_ko"),
            "urgency": gprog.get("urgency"),
            "goal_pct": gprog.get("pct"),
            "goal_label": gprog.get("label"),
            "threat_ko": gprog.get("threat_ko"),
            "market": sess,
            "capital": {
                "budget": plan.get("budget"),
                "remaining": plan.get("remaining_budget"),
                "open_cost": plan.get("open_cost"),
                "sleeve": plan.get("sleeve"),
            },
            "server_note": "24시간 실시간 · 뉴스 레이더+분석 · 휴장은 준비모드 · 창 닫아도 계속",
            "now_iso": datetime.now(UTC).isoformat(),
        }
    )


@app.get("/api/activity/feed")
def api_activity_feed(limit: int = 80, _: None = Depends(require_auth)):
    limit = max(1, min(int(limit or 80), 200))
    return JSONResponse({"items": ActivityLog().recent(limit=limit)})


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
        engine = ExecutionEngine(require_confirm=False)
        portfolio = load_portfolio(settings.portfolio_path)
        filled = 0
        for d in result.decisions:
            if d.action in (Action.HOLD, Action.DO_NOTHING):
                continue
            out = engine.execute_decision(d, portfolio=portfolio, confirm=True)
            if out.accepted:
                filled += 1
        return {
            "message": f"AI 주문 {filled}건 체결 (승인 없음)",
            "filled": filled,
            "redirect": "/ai",
        }

    job_id = start_job("plan_trades", _work, message="주문 후보 생성 중…")
    return RedirectResponse(url=f"/job/{job_id}", status_code=303)


@app.post("/actions/approve")
def approve_trade(
    entry_id: int = Form(...),
    live_confirm: str = Form(""),
    _: None = Depends(require_auth),
):
    engine = ExecutionEngine(require_confirm=False)
    if engine.mode == "alpaca_live" or (
        live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", PAPER_URL)
    ):
        if live_confirm.strip().upper() != "LIVE":
            return _flash("/ai", "실거래 승인 실패 · 확인란에 LIVE 를 입력하세요")
    result = engine.confirm_journal_entry(entry_id)
    msg = "체결 완료" if result.accepted else f"실패 · {result.message}"
    return _flash("/ai", msg)


@app.post("/actions/reject")
def reject_trade(entry_id: int = Form(...), _: None = Depends(require_auth)):
    result = ExecutionEngine().reject_journal_entry(entry_id)
    return _flash("/ai", "주문을 거절했습니다" if result.accepted else result.message)


@app.post("/actions/approve_all")
def approve_all(_: None = Depends(require_auth)):
    if live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", PAPER_URL):
        return _flash("/ai", "실거래에서는 일괄 승인이 금지됩니다 · 한 건씩 LIVE 확인 후 승인")
    engine = ExecutionEngine(require_confirm=False)
    planned = TradeJournal().list_recent(limit=100, status="planned")
    ok = fail = 0
    for row in planned:
        out = engine.confirm_journal_entry(int(row["id"]))
        if out.accepted:
            ok += 1
        else:
            fail += 1
    return _flash("/ai", f"승인 {ok}건 · 실패 {fail}건")


@app.post("/actions/broker_connect")
def broker_connect(
    api_key: str = Form(...),
    secret_key: str = Form(...),
    account_type: str = Form("paper"),
    max_notional: str = Form("15"),
    _: None = Depends(require_auth),
):
    api_key = api_key.strip()
    secret_key = secret_key.strip()
    if len(api_key) < 8 or len(secret_key) < 8:
        return _flash("/settings", "API 키가 너무 짧습니다")
    is_live = account_type.strip().lower() == "live"
    base = LIVE_URL if is_live else PAPER_URL
    try:
        max_n = float(max_notional or "15")
    except ValueError:
        max_n = 15.0
    max_n = max(5.0, min(max_n, 500.0))
    first_n = min(8.0, max_n)

    # Probe before saving
    try:
        probe = AlpacaBroker(api_key=api_key, secret_key=secret_key, base_url=base)
        acct = probe.get_account()
    except Exception as exc:
        return _flash("/settings", f"브로커 연결 실패 · {exc}")

    updates = {
        "ORACLE_BROKER": "alpaca",
        "ALPACA_API_KEY": api_key,
        "ALPACA_SECRET_KEY": secret_key,
        "ALPACA_BASE_URL": base,
        "ORACLE_LIVE_MAX_NOTIONAL": str(max_n),
        "ORACLE_FIRST_TRADE_NOTIONAL": str(first_n),
        # Never auto-arm live just by connecting; require explicit arm
        "ORACLE_LIVE_TRADING": "0",
    }
    upsert_env(updates)
    cache_clear("broker")
    cache_clear("llm")

    try:
        sync_portfolio_from_broker(probe)
    except Exception:
        pass

    if is_live:
        return _flash(
            "/settings",
            f"실계좌 키 연결됨 · Equity ${acct.equity:,.2f} · 아래에서 LIVE 무장 필요",
        )
    return _flash(
        "/settings",
        f"Alpaca Paper 연결됨 · Equity ${acct.equity:,.2f} · 소액 주문 한도 ${max_n:.0f}",
    )


@app.post("/actions/arm_live")
def arm_live(confirm: str = Form(...), _: None = Depends(require_auth)):
    if confirm.strip().upper() != "LIVE":
        return _flash("/settings", "무장 실패 · 확인란에 LIVE 를 정확히 입력하세요")
    if not alpaca_configured():
        return _flash("/settings", "먼저 브로커 키를 연결하세요")
    base = os.getenv("ALPACA_BASE_URL", PAPER_URL)
    if "paper" in base:
        return _flash(
            "/settings",
            "Paper 계정으로는 실거래 무장 불가 · 위에서 계정 유형을 실계좌로 다시 연결하세요",
        )
    upsert_env({"ORACLE_LIVE_TRADING": "1"})
    try:
        broker = AlpacaBroker()
        acct = broker.get_account()
        sync_portfolio_from_broker(broker)
    except Exception as exc:
        upsert_env({"ORACLE_LIVE_TRADING": "0"})
        return _flash("/settings", f"실계좌 무장 실패 · {exc}")
    return _flash(
        "/settings",
        f"⚠ 실거래 무장 완료 · Equity ${acct.equity:,.2f} · 주문당 최대 ${live_max_notional():.0f}",
    )


@app.post("/actions/disarm_live")
def disarm_live(_: None = Depends(require_auth)):
    upsert_env({"ORACLE_LIVE_TRADING": "0", "ALPACA_BASE_URL": PAPER_URL})
    return _flash("/settings", "실거래 무장 해제 · Paper URL로 복귀")


@app.post("/actions/sync_broker")
def sync_broker(_: None = Depends(require_auth)):
    broker = get_broker()
    if broker is None:
        return _flash("/settings", "연결된 브로커가 없습니다")
    try:
        cache_clear()
        state = sync_portfolio_from_broker(broker)
        return _flash("/", f"브로커 동기화 완료 · 현금 ${state.cash:,.2f} · {len(state.positions)}종목")
    except Exception as exc:
        return _flash("/settings", f"동기화 실패 · {exc}")


@app.post("/actions/first_money_order")
def first_money_order(
    symbol: str = Form("SPY"),
    notional: str = Form(""),
    _: None = Depends(require_auth),
):
    """Queue a tiny first broker order (paper or live) for human approve."""
    if not alpaca_configured() or get_broker() is None:
        return _flash("/ai", "먼저 설정에서 Alpaca를 연결하세요")
    symbol = (symbol or "SPY").upper().strip()
    try:
        dollars = float(notional) if notional.strip() else first_trade_notional()
    except ValueError:
        dollars = first_trade_notional()
    dollars = max(1.0, min(dollars, live_max_notional()))

    # Price for share estimate
    from oracle.data.market import fetch_snapshot

    price = float(fetch_snapshot(symbol).price)
    shares = dollars / price if price else 0.0
    mode = "실거래" if live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", "") else "브로커페이퍼"
    jid = TradeJournal().add(
        JournalEntry(
            ts=now_iso(),
            symbol=symbol,
            action="Buy",
            shares=shares,
            price=price,
            rationale=f"첫 실전 소액 주문 · ${dollars:.2f} · {mode} · 승인 시 브로커 시장가",
            status="planned",
            client_order_id=f"first-{uuid.uuid4().hex[:10]}",
        )
    )
    return _flash("/ai", f"첫 소액 주문 #{jid} 준비 · ${dollars:.2f} {symbol} · 승인하면 브로커로 나갑니다")


@app.post("/actions/practice_order")
def practice_order(_: None = Depends(require_auth)):
    """Create one tiny planned order so the approve UX can be verified (local paper only)."""
    if live_armed() and "paper" not in os.getenv("ALPACA_BASE_URL", PAPER_URL):
        return _flash("/ai", "실거래 모드에서는 로컬 연습 주문을 만들 수 없습니다")
    settings = get_settings()
    portfolio = load_portfolio(settings.portfolio_path)
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
            rationale="연습 주문 — 승인 버튼·체결 경로 확인용 (로컬 모의)",
            status="planned",
            client_order_id=f"practice-{uuid.uuid4().hex[:10]}",
        )
    )
    return _flash("/ai", f"연습 주문 #{jid} 준비됨 · 승인하면 모의 체결됩니다")


@app.post("/actions/autopilot")
def autopilot_toggle(
    enabled: str = Form(...),
    allow_live: str = Form("0"),
    _: None = Depends(require_auth),
):
    on = enabled.strip() in {"1", "true", "on"}
    live_ok = allow_live.strip() in {"1", "true", "on"}
    if on and live_ok and not live_armed():
        return _flash("/settings", "실거래 자율매매는 먼저 LIVE 무장이 필요합니다")
    if on:
        plan = capital_plan()
        g = goal_progress(0.0)
        if not (plan.get("set") and g.get("set")):
            return _flash("/ai", "먼저 AI 한도·목표·기간을 저장하세요")
    autopilot_set(on, allow_live=live_ok and on)
    autopilot_start()
    if on:
        return _flash("/ai", "24시간 ON · 한도 안만 쓰며 시장 분석·매매 계속")
    return _flash("/ai", "멈춤 · 다시 시작하려면 버튼을 누르세요")


@app.post("/actions/set_goal")
def set_goal_action(
    goal: str = Form(...),
    budget: str = Form(...),
    days: str = Form(...),
    deadline: str = Form(""),
    next_path: str = Form("/ai"),
    _: None = Depends(require_auth),
):
    """Mission = AI spend limit + goal + days (from existing account cash)."""
    dest = "/ai"
    if (next_path or "").strip() in {"/", "/ai", "/activity", "/settings"}:
        dest = (next_path or "/ai").strip()

    def _fail(msg: str):
        return _flash(dest, msg)

    try:
        amount = float(goal)
        budget_v = float(budget)
        days_i = int(float(days))
    except ValueError:
        return _fail("AI 한도 / 목표 / 기간을 숫자로 입력하세요")
    if budget_v < 1:
        return _fail("AI 사용 한도는 $1 이상이어야 합니다")
    if amount <= budget_v:
        return _fail("목표는 AI 한도보다 커야 합니다")
    if days_i < 1:
        return _fail("기간은 1일 이상이어야 합니다")

    dl = (deadline or "").strip() or None
    try:
        saved = set_capital_plan(
            budget=budget_v,
            goal=amount,
            days=days_i,
            deadline=dl,
        )
    except ValueError:
        return _fail("마감일 형식이 올바르지 않습니다 (YYYY-MM-DD)")
    cache_clear()
    msg = (
        f"AI한도 ${saved['budget']:,.0f} · 목표 ${saved['goal']:,.0f} · "
        f"{days_i}일 · 못 채우면 소멸"
    )
    if saved.get("deadline"):
        msg += f" · 마감 {saved['deadline']}"
    return _flash(dest, msg)


@app.post("/actions/reset_paper")
def reset_paper(_: None = Depends(require_auth)):
    """Wipe ALL fake local state + cancel paper orders; clean cash-only portfolio."""
    import shutil

    import yaml
    from oracle.config import resolve_path

    settings = get_settings()
    data = Path(settings.data_dir)
    for name in (
        "journal.db",
        "jobs.db",
        "oracle.db",
        "activity.db",
        "news.db",
        "autopilot_state.json",
    ):
        p = data / name
        if p.exists():
            p.unlink()
    for sub in ("cache", "reports", "logs"):
        d = data / sub
        if d.exists():
            shutil.rmtree(d, ignore_errors=True)
            d.mkdir(parents=True, exist_ok=True)

    equity = 0.0
    broker = get_broker()
    if broker is not None:
        try:
            # Cancel open paper orders + attempt close-all (fills when market open)
            if hasattr(broker, "cancel_all"):
                try:
                    broker.cancel_all()
                except Exception:
                    pass
            import httpx

            base = os.getenv("ALPACA_BASE_URL", PAPER_URL).rstrip("/")
            headers = {
                "APCA-API-KEY-ID": os.getenv("ALPACA_API_KEY", ""),
                "APCA-API-SECRET-KEY": os.getenv("ALPACA_SECRET_KEY", ""),
            }
            with httpx.Client(timeout=30.0, trust_env=False) as client:
                client.delete(f"{base}/v2/orders", headers=headers)
                client.delete(f"{base}/v2/positions", headers=headers)
            acct = broker.get_account()
            equity = float(acct.equity)
        except Exception as exc:
            return _flash("/settings", f"초기화 실패 · {exc}")
    else:
        equity = 10000.0

    # Local clean slate: no holdings, cash = paper equity
    dest = resolve_path(settings.portfolio_path)
    dest.write_text(
        yaml.safe_dump(
            {"cash": round(equity, 2), "currency": "USD", "positions": [], "targets": {}},
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    # Fresh mission: small AI budget so AI doesn't treat full paper $100k as deployable
    budget_amt = min(100.0, max(10.0, round(equity * 0.001, 2) or 10.0))
    goal_amt = max(budget_amt * 2.0, budget_amt + 20.0, 50.0)
    set_capital_plan(budget=budget_amt, goal=goal_amt, days=30)
    upsert_env({"ORACLE_AUTOPILOT": "1", "ORACLE_LIVE_TRADING": "0", "ORACLE_REQUIRE_CONFIRM": "0"})
    cache_clear()
    return _flash(
        "/",
        f"가짜 전부 삭제 · Paper 현금 ${equity:,.2f} · 보유 0 · 목표 ${goal_amt:,.0f}",
    )


@app.post("/actions/autopilot_now")
def autopilot_now(_: None = Depends(require_auth)):
    """Start / restart 24h autopilot (requires mission). First cycle runs as a job."""
    plan = capital_plan()
    g = goal_progress(float(plan.get("sleeve") or plan.get("budget") or 0.0))
    if not (plan.get("set") and g.get("set")):
        return _flash("/ai", "먼저 한도·목표·기간을 저장한 뒤 시작하세요")

    if not autopilot_enabled():
        autopilot_set(True, allow_live=False)
    autopilot_start()

    store = JobStore()

    def _work(job_id: str):
        def prog(msg: str) -> None:
            store.append_log(job_id, msg)

        prog("24시간 가동 시작 · AI 한도만 사용 · 창 꺼도 계속")
        out = autopilot_run_once(on_progress=prog)
        prog("첫 사이클 완료 · 서버 루프가 이어서 시장을 계속 봅니다")
        return {
            "message": out.get("message") or "24시간 가동 중",
            "redirect": "/ai",
            **{k: v for k, v in out.items() if k != "message"},
        }

    job_id = start_job("autopilot", _work, message="24시간 투자 시작 · 시장 분석…")
    return RedirectResponse(url=f"/ai?watch={job_id}", status_code=303)


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
    try:
        autopilot_start()
    except Exception:
        pass
    return app


# Start autopilot watcher when module loads under uvicorn
try:
    autopilot_start()
except Exception:
    pass
