"""Dashboard auth + route smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app


def test_dashboard_home_no_auth():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    assert "Project Oracle" in r.text


def test_dashboard_status_json():
    client = TestClient(app)
    r = client.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "equity" in data
    assert "kill_switch" in data
