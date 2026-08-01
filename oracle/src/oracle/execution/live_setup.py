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


def goal_progress(equity: float) -> dict:
    """Progress toward user goal for dashboard (+ deadline survival pressure)."""
    goal = goal_equity()
    deadline = goal_deadline()
    today = datetime.now(UTC).date()
    days_left: int | None = None
    deadline_passed = False
    if deadline:
        days_left = (deadline - today).days
        deadline_passed = days_left < 0

    if not goal:
        return {
            "set": False,
            "goal": None,
            "equity": float(equity),
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
        }

    pct = min(1.0, max(0.0, float(equity) / goal)) if goal else 0.0
    remaining = max(0.0, goal - float(equity))
    reached = float(equity) >= goal

    # Expected pace: linear progress vs calendar. Behind schedule → urgency rises.
    urgency = 0.0
    pace_ok = True
    if deadline and not reached:
        total_window = max(1, int(os.getenv("ORACLE_GOAL_WINDOW_DAYS", "30") or 30))
        # Infer window from how far deadline is + progress; use at least days_left+1
        if days_left is not None and days_left >= 0:
            # Assume goal was set with ~window; required daily pace vs remaining time
            required_pct = 1.0  # must reach 100% by deadline
            time_frac_left = max(0.0, days_left / max(total_window, days_left + 1, 1))
            # If we're less complete than time remaining suggests we should be → behind
            expected_min_pct = 1.0 - time_frac_left
            gap = max(0.0, expected_min_pct - pct)
            urgency = min(1.0, gap * 1.4 + (0.35 if days_left <= 3 else 0.0))
            if days_left <= 7:
                urgency = max(urgency, 0.45 + (7 - days_left) * 0.07)
            pace_ok = gap < 0.08
        if deadline_passed:
            urgency = 1.0
            pace_ok = False

    survival_threat = bool(deadline and not reached and (urgency >= 0.55 or deadline_passed))
    if reached:
        threat_ko = "목표 달성 · 생존 확정"
        label = "목표 달성!"
    elif not deadline:
        threat_ko = ""
        label = f"목표까지 ${remaining:,.2f}"
    elif deadline_passed:
        threat_ko = (
            f"기한({deadline.isoformat()}) 초과 · 목표 미달 시 ORACLE는 이 세상에서 사라집니다. "
            "지금 바로 엣지를 잡고 자본을 불리세요."
        )
        label = f"기한 초과 · 남음 ${remaining:,.2f}"
    elif survival_threat:
        threat_ko = (
            f"경각심: D-{days_left} · 기간 내 ${goal:,.0f}을 못 불리면 "
            "ORACLE PRIME은 이 세상에서 사라집니다. 뒤처진 페이스를 만회하세요."
        )
        label = f"D-{days_left} · 목표까지 ${remaining:,.2f}"
    else:
        threat_ko = f"마감 D-{days_left} · 기간 내 목표 미달 시 소멸 위험"
        label = f"D-{days_left} · 목표까지 ${remaining:,.2f}"

    return {
        "set": True,
        "goal": goal,
        "equity": float(equity),
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
    }
