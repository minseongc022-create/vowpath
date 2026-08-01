"""Autopilot + simplified AI UX smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.execution import autopilot as ap


def _no_auth(monkeypatch) -> None:
    monkeypatch.setenv("ORACLE_DASHBOARD_USER", "")
    monkeypatch.setenv("ORACLE_DASHBOARD_PASSWORD", "")


def test_ai_page_has_live_targets(monkeypatch):
    _no_auth(monkeypatch)
    client = TestClient(app)
    r = client.get("/ai")
    assert r.status_code == 200
    assert 'id="ai-panel"' in r.text
    assert "ap-live-log" in r.text
    assert "24시간 투자 시작" in r.text or "다시 시작" in r.text
    assert "멈추기" in r.text
    assert "/static/oracle.js" in r.text


def test_autopilot_toggle_off(monkeypatch, tmp_path):
    _no_auth(monkeypatch)
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.setattr(ap, "start_background", lambda: None)
    client = TestClient(app)
    r = client.post("/actions/autopilot", data={"enabled": "0"}, follow_redirects=False)
    assert r.status_code == 303
    assert "/ai" in r.headers["location"]


def test_autopilot_now_requires_mission(monkeypatch, tmp_path):
    _no_auth(monkeypatch)
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.delenv("ORACLE_AI_BUDGET", raising=False)
    monkeypatch.delenv("ORACLE_GOAL_EQUITY", raising=False)
    monkeypatch.setattr(ap, "start_background", lambda: None)
    client = TestClient(app)
    r = client.post("/actions/autopilot_now", follow_redirects=False)
    assert r.status_code == 303
    assert "flash=" in r.headers["location"]


def test_autopilot_now_redirects_to_ai_watch(monkeypatch, tmp_path):
    from oracle.execution.live_setup import set_capital_plan

    _no_auth(monkeypatch)
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    set_capital_plan(budget=50, goal=200, days=30)
    monkeypatch.setenv("ORACLE_AUTOPILOT", "0")
    monkeypatch.setattr(ap, "start_background", lambda: None)
    monkeypatch.setattr(ap, "run_once", lambda on_progress=None: {"ok": True, "message": "관망"})
    client = TestClient(app)
    r = client.post("/actions/autopilot_now", follow_redirects=False)
    assert r.status_code == 303
    loc = r.headers["location"]
    assert loc.startswith("/ai?watch=")


def test_job_api_includes_logs(tmp_path, monkeypatch):
    import sys

    from oracle.dashboard.jobs import JobStore

    _no_auth(monkeypatch)
    db = tmp_path / "jobs.db"
    store = JobStore(db)
    jid = store.create("autopilot", "시작")
    store.append_log(jid, "스크리닝 중")
    store.append_log(jid, "AI 판단")
    mod = sys.modules["oracle.dashboard.app"]
    monkeypatch.setattr(mod, "JobStore", lambda: JobStore(db))
    client = TestClient(app)
    r = client.get(f"/api/job/{jid}")
    assert r.status_code == 200
    data = r.json()
    assert data["message"] == "AI 판단"
    assert any(x.get("text") == "스크리닝 중" for x in data["logs"])
