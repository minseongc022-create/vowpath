"""Dashboard auth + multi-page route smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app


def test_dashboard_home_no_auth():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    assert "내 총자산" in r.text
    assert "오늘 할 일" in r.text
    assert "내 종목" in r.text
    assert 'href="/holdings"' in r.text
    assert 'href="/trades"' in r.text
    assert 'href="/settings"' in r.text


def test_dashboard_pages_navigate():
    client = TestClient(app)
    for path, needle in [
        ("/holdings", "내 종목"),
        ("/trades", "승인 대기"),
        ("/decisions", "분석 실행"),
        ("/settings", "긴급정지"),
    ]:
        r = client.get(path)
        assert r.status_code == 200, path
        assert needle in r.text, path


def test_dashboard_status_json():
    client = TestClient(app)
    r = client.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "equity" in data
    assert "kill_switch" in data
    assert "risk_score" in data
    assert "actionable" in data
    assert "broker" in data


def test_kill_switch_toggle():
    client = TestClient(app)
    r = client.post("/actions/kill", data={"active": "1"}, follow_redirects=False)
    assert r.status_code == 303
    assert "/settings" in r.headers["location"]
    r2 = client.get("/settings")
    assert "정지 중" in r2.text or "긴급정지" in r2.text
    r3 = client.post("/actions/kill", data={"active": "0"}, follow_redirects=False)
    assert r3.status_code == 303


def test_plan_trades_starts_job():
    client = TestClient(app)
    r = client.post("/actions/plan_trades", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"].startswith("/job/")


def test_practice_order_and_approve():
    client = TestClient(app)
    # ensure kill switch off for buy approve
    client.post("/actions/kill", data={"active": "0"}, follow_redirects=False)
    r = client.post("/actions/practice_order", follow_redirects=False)
    assert r.status_code == 303
    assert "/trades" in r.headers["location"]
    page = client.get("/trades")
    assert "연습 주문" in page.text or "승인하고 체결" in page.text
    import re

    m = re.search(r'name="entry_id" value="(\d+)"', page.text)
    assert m, "expected planned entry on trades page"
    eid = m.group(1)
    r2 = client.post("/actions/approve", data={"entry_id": eid}, follow_redirects=False)
    assert r2.status_code == 303
    assert "flash=" in r2.headers["location"]
