"""Live setup helpers + broker connect smoke (no real keys required)."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.execution.live_setup import live_max_notional, upsert_env


def test_upsert_env(tmp_path: Path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("FOO=1\n", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env_file)
    upsert_env({"FOO": "2", "BAR": "x"})
    text = env_file.read_text(encoding="utf-8")
    assert "FOO=2" in text
    assert "BAR=x" in text


def test_settings_has_broker_form():
    client = TestClient(app)
    r = client.get("/settings")
    assert r.status_code == 200
    assert "계좌 연결" in r.text
    assert 'action="/actions/broker_connect"' in r.text


def test_broker_connect_rejects_short_keys():
    client = TestClient(app)
    r = client.post(
        "/actions/broker_connect",
        data={"api_key": "short", "secret_key": "short", "account_type": "paper", "max_notional": "50"},
        follow_redirects=False,
    )
    assert r.status_code == 303
    assert "settings" in r.headers["location"]


def test_live_max_notional_default():
    assert live_max_notional() >= 5
