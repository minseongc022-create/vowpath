"""Autopilot + scroll UX smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.execution import autopilot as ap


def test_trades_has_scroll_targets():
    client = TestClient(app)
    r = client.get("/trades")
    assert r.status_code == 200
    assert 'id="pending-approvals"' in r.text
    assert 'id="action-cta"' in r.text
    assert 'id="autopilot-panel"' in r.text
    assert "골라서 매수" in r.text
    assert "/static/oracle.js" in r.text


def test_autopilot_toggle_off(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    monkeypatch.setattr(ap, "start_background", lambda: None)
    client = TestClient(app)
    r = client.post("/actions/autopilot", data={"enabled": "0"}, follow_redirects=False)
    assert r.status_code == 303
    assert "trades" in r.headers["location"]
