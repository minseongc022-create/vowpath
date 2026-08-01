"""Goal deadline + survival pressure + activity log."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.execution.live_setup import goal_progress, set_goal, upsert_env
from oracle.portfolio.activity_log import ActivityLog, format_clock


def test_set_goal_with_days(monkeypatch, tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    client = TestClient(app)
    r = client.post(
        "/actions/set_goal",
        data={"goal": "200000", "days": "14"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    text = env.read_text(encoding="utf-8")
    assert "ORACLE_GOAL_EQUITY=200000.00" in text
    assert "ORACLE_GOAL_DEADLINE=" in text


def test_goal_progress_deadline_threat(monkeypatch, tmp_path: Path):
    env = tmp_path / ".env"
    yesterday = (datetime.now(UTC).date() - timedelta(days=1)).isoformat()
    env.write_text(
        f"ORACLE_GOAL_EQUITY=1000\nORACLE_GOAL_DEADLINE={yesterday}\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.setenv("ORACLE_GOAL_EQUITY", "1000")
    monkeypatch.setenv("ORACLE_GOAL_DEADLINE", yesterday)
    g = goal_progress(100.0)
    assert g["set"] is True
    assert g["deadline_passed"] is True
    assert g["survival_threat"] is True
    assert "사라" in g["threat_ko"]


def test_set_goal_helper(monkeypatch, tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    out = set_goal(500.0, days=7)
    assert out["goal"] == 500.0
    assert out["deadline"]
    assert "ORACLE_GOAL_DEADLINE=" in env.read_text(encoding="utf-8")


def test_activity_log_timestamps(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("ORACLE_DATA_DIR", str(tmp_path))
    # Force settings reload path via direct db
    log = ActivityLog(db_path=tmp_path / "activity.db")
    log.add("screen", "탐색 완료", detail="AAPL · MSFT")
    log.add("trade", "체결 AAPL Buy", symbol="AAPL")
    rows = log.recent(10)
    assert len(rows) == 2
    assert rows[0]["kind"] == "trade"
    assert rows[0]["clock"]
    assert ":" in rows[0]["clock"]
    assert format_clock(rows[0]["ts"]).count(":") == 2


def test_activity_page_has_timeline():
    client = TestClient(app)
    r = client.get("/activity")
    assert r.status_code == 200
    assert "활동 타임라인" in r.text
    assert "act-feed" in r.text


def test_ai_page_has_deadline_field():
    client = TestClient(app)
    r = client.get("/ai")
    assert r.status_code == 200
    assert "기간 (일)" in r.text
    assert "소멸" in r.text
    assert "AI가 쓸 한도" in r.text


def test_activity_feed_api():
    client = TestClient(app)
    r = client.get("/api/activity/feed")
    assert r.status_code == 200
    assert "items" in r.json()


def test_set_capital_plan_mission(monkeypatch, tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    client = TestClient(app)
    r = client.post(
        "/actions/set_goal",
        data={"seed": "10", "budget": "5", "goal": "20", "days": "30"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    text = env.read_text(encoding="utf-8")
    assert "ORACLE_SEED_CAPITAL=10.00" in text
    assert "ORACLE_AI_BUDGET=5.00" in text
    assert "ORACLE_GOAL_EQUITY=20.00" in text


def test_budget_cannot_exceed_seed(monkeypatch, tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    client = TestClient(app)
    r = client.post(
        "/actions/set_goal",
        data={"seed": "10", "budget": "50", "goal": "20", "days": "7"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "flash=" in r.headers["location"]


def test_sleeve_progress_uses_seed(monkeypatch, tmp_path: Path):
    from oracle.execution.live_setup import set_capital_plan, goal_progress

    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    set_capital_plan(seed=100, budget=50, goal=200, days=30)
    g = goal_progress(100000.0, sleeve=100.0)
    assert g["stake"] == 100.0
    assert g["pct"] == 0.0
    g2 = goal_progress(100000.0, sleeve=150.0)
    assert 0.49 < g2["pct"] < 0.51
