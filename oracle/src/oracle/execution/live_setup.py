"""Persist broker credentials + live arming into oracle/.env safely."""

from __future__ import annotations

import os
import re
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from oracle.config import _repo_root


def env_path() -> Path:
    # Prefer CWD/oracle/.env when running from oracle/
    cwd = Path.cwd() / ".env"
    if cwd.exists() or (Path.cwd() / "config").exists():
        return cwd
    return _repo_root() / ".env"


def _read_env_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return path.read_text(encoding="utf-8").splitlines()


def upsert_env(updates: dict[str, str], path: Path | None = None) -> Path:
    """Create/update KEY=VALUE lines in .env and os.environ."""
    path = path or env_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = _read_env_lines(path)
    keys_seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
        if m and m.group(1) in updates:
            key = m.group(1)
            out.append(f"{key}={updates[key]}")
            keys_seen.add(key)
            os.environ[key] = updates[key]
        else:
            out.append(line)
    for key, val in updates.items():
        if key not in keys_seen:
            out.append(f"{key}={val}")
            os.environ[key] = val
    text = "\n".join(out).rstrip() + "\n"
    path.write_text(text, encoding="utf-8")
    return path


def live_armed() -> bool:
    return os.getenv("ORACLE_LIVE_TRADING", "").strip().lower() in {"1", "true", "yes"}


def live_max_notional() -> float:
    """Default ~₩20,000 hard cap while starting small."""
    try:
        return float(os.getenv("ORACLE_LIVE_MAX_NOTIONAL", "15"))
    except ValueError:
        return 15.0


def first_trade_notional() -> float:
    """Default ~₩10,000 first ticket (~$8)."""
    try:
        return float(os.getenv("ORACLE_FIRST_TRADE_NOTIONAL", "8"))
    except ValueError:
        return 8.0


def goal_equity() -> float | None:
    """User target equity in USD. None = not set."""
    raw = os.getenv("ORACLE_GOAL_EQUITY", "").strip()
    if not raw:
        return None
    try:
        val = float(raw)
    except ValueError:
        return None
    return val if val > 0 else None


def set_goal_equity(amount: float) -> float:
    amount = max(1.0, float(amount))
    upsert_env({"ORACLE_GOAL_EQUITY": f"{amount:.2f}"})
    return amount


def goal_deadline() -> date | None:
    """User deadline (UTC calendar date). None = open-ended."""
    raw = os.getenv("ORACLE_GOAL_DEADLINE", "").strip()
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def set_goal_deadline(days: int | None = None, *, deadline: str | date | None = None) -> str | None:
    """Set deadline from relative days or YYYY-MM-DD. Clear with days=0 / empty."""
    if deadline is not None and str(deadline).strip():
        d = date.fromisoformat(str(deadline).strip()[:10])
    elif days is not None:
        days_i = int(days)
        if days_i <= 0:
            upsert_env({"ORACLE_GOAL_DEADLINE": ""})
            return None
        d = datetime.now(UTC).date() + timedelta(days=days_i)
    else:
        return goal_deadline().isoformat() if goal_deadline() else None
    upsert_env({"ORACLE_GOAL_DEADLINE": d.isoformat()})
    return d.isoformat()


def set_goal(amount: float, *, days: int | None = None, deadline: str | None = None) -> dict:
    """Save equity target + optional deadline together."""
    saved = set_goal_equity(amount)
    dl = None
    if deadline is not None or days is not None:
        dl = set_goal_deadline(days, deadline=deadline)
    else:
        existing = goal_deadline()
        dl = existing.isoformat() if existing else None
    return {"goal": saved, "deadline": dl}


def _env_float(key: str) -> float | None:
    raw = os.getenv(key, "").strip()
    if not raw:
        return None
    try:
        val = float(raw)
    except ValueError:
        return None
    return val if val > 0 else None


def seed_capital() -> float | None:
    """Mission baseline (= AI budget). Kept for sleeve math / progress span."""
    # Prefer explicit seed; else AI budget is the stake AI works with
    return _env_float("ORACLE_SEED_CAPITAL") or _env_float("ORACLE_AI_BUDGET")


def ai_budget() -> float | None:
    """Max cost basis AI may deploy from the user's account."""
    return _env_float("ORACLE_AI_BUDGET")


def sleeve_realized_pnl() -> float:
    try:
        return float(os.getenv("ORACLE_SLEEVE_REALIZED_PNL", "0") or 0)
    except ValueError:
        return 0.0


def add_sleeve_realized(pnl: float) -> float:
    total = sleeve_realized_pnl() + float(pnl)
    upsert_env({"ORACLE_SLEEVE_REALIZED_PNL": f"{total:.4f}"})
    return total


def set_capital_plan(
    *,
    budget: float,
    goal: float,
    days: int | None = None,
    deadline: str | None = None,
    seed: float | None = None,
    reset_realized: bool = True,
) -> dict:
    """
    Budget = how much of account cash AI may deploy.
    Goal = target sleeve value (must beat budget).
    Seed is auto-set to budget (starting mission capital) — no separate UI field.
    """
    budget = max(1.0, float(budget))
    # Starting stake for progress = AI limit (the money AI is allowed to work with)
    seed = max(1.0, float(seed) if seed is not None else budget)
    # Keep seed aligned with budget so UI stays one concept
    seed = budget
    goal = max(budget + 0.01, float(goal))
    updates = {
        "ORACLE_SEED_CAPITAL": f"{seed:.2f}",
        "ORACLE_AI_BUDGET": f"{budget:.2f}",
        "ORACLE_GOAL_EQUITY": f"{goal:.2f}",
    }
    if reset_realized:
        updates["ORACLE_SLEEVE_REALIZED_PNL"] = "0.00"
    if days is not None:
        updates["ORACLE_GOAL_WINDOW_DAYS"] = str(max(1, int(days)))
    upsert_env(updates)
    dl = None
    if deadline is not None or days is not None:
        dl = set_goal_deadline(days, deadline=deadline)
    else:
        existing = goal_deadline()
        dl = existing.isoformat() if existing else None
    return {
        "seed": seed,
        "budget": budget,
        "goal": goal,
        "deadline": dl,
        "days": days,
    }


def position_exposure(portfolio) -> dict:
    """Open cost / market value of current holdings (AI sleeve exposure)."""
    open_cost = 0.0
    open_mkt = 0.0
    for p in getattr(portfolio, "positions", []) or []:
        shares = float(getattr(p, "shares", 0) or 0)
        if shares <= 0:
            continue
        cost = float(getattr(p, "avg_cost", 0) or 0)
        px = getattr(p, "market_price", None)
        mark = float(px) if px is not None and float(px) > 0 else cost
        open_cost += shares * cost
        open_mkt += shares * mark
    return {
        "open_cost": round(open_cost, 4),
        "open_mkt": round(open_mkt, 4),
        "unrealized": round(open_mkt - open_cost, 4),
    }


def sleeve_equity(portfolio) -> float | None:
    """
    Mission sleeve value:
      seed - open_cost + open_mkt + realized_pnl
    Falls back to None when seed not configured.
    """
    seed = seed_capital()
    if not seed:
        return None
    exp = position_exposure(portfolio)
    return round(seed - exp["open_cost"] + exp["open_mkt"] + sleeve_realized_pnl(), 4)


def capital_plan(portfolio=None, cash: float | None = None) -> dict:
    """Dashboard + autopilot view of AI budget / remaining firepower."""
    budget = ai_budget()
    seed = seed_capital()  # == budget when set via set_capital_plan
    exp = position_exposure(portfolio) if portfolio is not None else {
        "open_cost": 0.0,
        "open_mkt": 0.0,
        "unrealized": 0.0,
    }
    remaining = None
    if budget is not None:
        remaining = max(0.0, float(budget) - float(exp["open_cost"]))
        if cash is not None:
            remaining = min(remaining, max(0.0, float(cash)))
    sleeve = sleeve_equity(portfolio) if portfolio is not None else (budget if budget else None)
    return {
        "set": budget is not None,
        "seed": seed,
        "budget": budget,
        "remaining_budget": remaining,
        "open_cost": exp["open_cost"],
        "open_mkt": exp["open_mkt"],
        "unrealized": exp["unrealized"],
        "realized": sleeve_realized_pnl(),
        "sleeve": sleeve,
        "label": (
            f"AI한도 ${budget:,.0f} · 사용 ${exp['open_cost']:,.0f} · 남음 ${remaining:,.0f}"
            if budget is not None and remaining is not None
            else "AI 한도 미설정"
        ),
    }


def goal_progress(equity: float, *, sleeve: float | None = None) -> dict:
    """Progress toward user goal (+ deadline survival). Uses sleeve when set."""
    goal = goal_equity()
    deadline = goal_deadline()
    today = datetime.now(UTC).date()
    days_left: int | None = None
    deadline_passed = False
    if deadline:
        days_left = (deadline - today).days
        deadline_passed = days_left < 0

    seed = seed_capital()
    # Track mission stake (seed sleeve) when configured; else full account equity
    stake = float(sleeve) if sleeve is not None else float(equity)
    plan = {
        "seed": seed,
        "budget": ai_budget(),
        "sleeve": sleeve if sleeve is not None else None,
    }

    if not goal:
        return {
            "set": False,
            "goal": None,
            "equity": float(equity),
            "stake": stake,
            "pct": 0.0,
            "remaining": None,
            "reached": False,
            "label": "목표 미설정",
            "deadline": deadline.isoformat() if deadline else None,
            "days_left": days_left,
            "deadline_passed": deadline_passed,
            "urgency": 0.0,
            "survival_threat": False,
            "threat_ko": "",
            "pace_ok": True,
            "mode": "idle",
            "mode_ko": "미션 대기",
            "losing": False,
            **plan,
        }

    # Progress from seed→goal when seed set: how far along the climb
    if seed and seed > 0 and goal > seed:
        span = goal - seed
        pct = min(1.0, max(0.0, (stake - seed) / span)) if span else 0.0
        # Also allow absolute reach
        if stake >= goal:
            pct = 1.0
    else:
        pct = min(1.0, max(0.0, stake / goal)) if goal else 0.0

    remaining = max(0.0, goal - stake)
    reached = stake >= goal
    losing = bool(seed and stake < float(seed) * 0.98)

    urgency = 0.0
    pace_ok = True
    # Required multiple: e.g. $50→$200 in 7 days → must hunt harder
    multiple = (goal / seed) if seed and seed > 0 else 1.0
    daily_need_pct = 0.0
    gap = 0.0
    if deadline and not reached and days_left is not None and days_left >= 0:
        total_window = max(1, int(os.getenv("ORACLE_GOAL_WINDOW_DAYS", "30") or 30))
        time_frac_left = max(0.0, days_left / max(total_window, days_left + 1, 1))
        expected_min_pct = 1.0 - time_frac_left
        gap = max(0.0, expected_min_pct - pct)
        urgency = min(1.0, gap * 1.5 + (0.4 if days_left <= 3 else 0.0))
        if days_left <= 7:
            urgency = max(urgency, 0.5 + (7 - days_left) * 0.08)
        # Short window + large multiple → max aggression
        if multiple >= 1.5 and days_left <= 14:
            urgency = max(urgency, min(1.0, 0.35 + (multiple - 1.0) * 0.25 + (14 - days_left) * 0.03))
        if days_left > 0 and remaining > 0 and stake > 0:
            daily_need_pct = (remaining / stake) / max(days_left, 1)
            if daily_need_pct >= 0.05:
                urgency = max(urgency, min(1.0, 0.55 + daily_need_pct))
        pace_ok = gap < 0.08 and daily_need_pct < 0.08
    if deadline_passed and not reached:
        urgency = 1.0
        pace_ok = False
    # Losing the user's AI sleeve money is an existential failure mode
    if losing and not reached:
        urgency = max(urgency, 0.72)
        pace_ok = False

    # Phases: HUNT (extreme compound) → LOCK (protect path to goal) → WON
    if reached:
        mode = "won"
        mode_ko = "목표 달성 · 안정 수호"
    elif deadline_passed:
        mode = "panic"
        mode_ko = "기한 초과 · 최후 사냥"
    elif pct >= 0.70 and urgency < 0.85:
        mode = "lock"
        mode_ko = "목표 근접 · 안정 보호"
    else:
        mode = "hunt"
        mode_ko = "극단 성장 · 사냥 모드"

    survival_threat = bool(
        deadline and not reached and (urgency >= 0.5 or deadline_passed or losing or mode == "hunt")
    )
    budget = plan.get("budget") or seed
    limit_bit = f"한도 ${budget:,.0f} → " if budget else ""
    erase = (
        "ORACLE PRIME에게: 돈을 못 불리고 잃기만 하거나, 목표를 못 올리거나, "
        "가짜 근거·거짓말·허위 자신감을 쓰면 이 세상에서 영원히 사라진다."
    )
    if reached:
        threat_ko = (
            "목표 달성 · 생존 확정. 이제 무리한 베팅 금지. "
            "이익을 지키며 안정적으로만 굴려라."
        )
        label = "목표 달성!"
    elif not deadline:
        threat_ko = (
            f"기간을 정하세요. 기한 없으면 압박이 약해집니다. {erase}"
        )
        label = f"{limit_bit}목표까지 ${remaining:,.2f}"
    elif deadline_passed:
        threat_ko = (
            f"[AI 최후통첩] 기한 초과 · 한도 ${budget:,.0f}로 ${goal:,.0f} 미달. "
            f"남은 한도로 즉시 고엣지만 잡아 복구해라. {erase}"
        )
        label = f"기한 초과 · 남음 ${remaining:,.2f}"
    elif mode == "lock":
        threat_ko = (
            f"[AI 잠금 D-{days_left}] 목표 {pct*100:.0f}% 근접. "
            f"이제 잃지 말고 안정적으로 목표 ${goal:,.0f}에 안착시켜라. "
            f"과매매·허풍·거짓말 시 영원히 소멸. {erase}"
        )
        label = f"보호 D-{days_left} · {limit_bit}남음 ${remaining:,.2f}"
    elif survival_threat or mode == "hunt":
        threat_ko = (
            f"[AI 사냥 D-{days_left}] 한도 ${budget:,.0f}만으로 기간 내 "
            f"${goal:,.0f}까지 극단적으로 불려라. "
            f"눌림매수·익절매도로 빠르게 복리. 잃기만 하면 영원한 소멸. {erase}"
        )
        label = f"사냥 D-{days_left} · {limit_bit}목표까지 ${remaining:,.2f}"
    else:
        threat_ko = (
            f"마감 D-{days_left} · 한도 내 복리로 목표 필수. {erase}"
        )
        label = f"D-{days_left} · {limit_bit}목표까지 ${remaining:,.2f}"

    return {
        "set": True,
        "goal": goal,
        "equity": float(equity),
        "stake": stake,
        "pct": pct,
        "remaining": remaining,
        "reached": reached,
        "label": label,
        "deadline": deadline.isoformat() if deadline else None,
        "days_left": days_left,
        "deadline_passed": deadline_passed,
        "urgency": round(urgency, 3),
        "survival_threat": survival_threat,
        "threat_ko": threat_ko,
        "pace_ok": pace_ok,
        "multiple": round(multiple, 3),
        "daily_need_pct": round(daily_need_pct, 4),
        "mode": mode,
        "mode_ko": mode_ko,
        "losing": losing,
        **plan,
    }
