"""USD/KRW FX display helpers."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app
from oracle.data import fx as fx_mod


def test_fx_snapshot_shape(monkeypatch):
    monkeypatch.setattr(fx_mod, "_fetch_usdkrw_uncached", lambda _b: 1400.0)
    snap = fx_mod.fx_snapshot()
    assert snap["usdkrw"] == 1400.0
    assert "원" in snap["label_ko"]


def test_api_fx():
    client = TestClient(app)
    r = client.get("/api/fx")
    assert r.status_code == 200
    data = r.json()
    assert "usdkrw" in data
    assert float(data["usdkrw"]) > 500


def test_home_has_currency_toggle():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    assert "fx-toggle" in r.text
    assert "원화" in r.text or "₩" in r.text
    assert 'data-usd=' in r.text
