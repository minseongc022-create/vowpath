"""Autopilot + simplified AI UX smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.execution import autopilot as ap


def test_ai_page_has_live_targets():
    client = TestClient(app)
    r = client.get("/ai")
    assert r.status_code == 200
    assert 'id="ai-panel"' in r.text
    assert "ap-live-log" in r.text
    assert "지금 투자 시작" in r.text
    assert "/static/oracle.js" in r.text


def test_autopilot_toggle_off(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.setattr(ap, "start_background", lambda: None)
    client = TestClient(app)
    r = client.post("/actions/autopilot", data={"enabled": "0"}, follow_redirects=False)
    assert r.status_code == 303
    assert "/ai" in r.headers["location"]


def test_autopilot_now_redirects_to_ai_watch(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("ORACLE_AUTOPILOT=1\n", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.setenv("ORACLE_AUTOPILOT", "1")
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
