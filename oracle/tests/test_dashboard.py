"""Dashboard auth + simplified 3-page route smoke tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from oracle.dashboard.app import app


def test_money_page_has_cash_and_holdings():
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    assert "내 총자산" in r.text
    assert "현금 · 충전" in r.text
    assert "투자한 종목" in r.text
    assert 'href="/ai"' in r.text
    assert 'href="/activity"' in r.text
    assert 'href="/settings"' in r.text


def test_activity_page_has_charts():
    client = TestClient(app)
    r = client.get("/activity")
    assert r.status_code == 200
    assert "가격 그래프" in r.text
    assert "매매 기록" in r.text
    assert "price-chart" in r.text
    r2 = client.get("/api/chart/SPY")
    assert r2.status_code == 200
    data = r2.json()
    assert "labels" in data and "prices" in data
    r3 = client.get("/api/activity/flow")
    assert r3.status_code == 200


def test_ai_page_has_goal_and_one_button():
    client = TestClient(app)
    r = client.get("/ai")
    assert r.status_code == 200
    assert "AI 투자" in r.text
    assert "지금 투자 시작" in r.text
    assert "목표 자산" in r.text
    assert 'href="/"' in r.text


def test_old_routes_redirect():
    client = TestClient(app)
    for path, dest in [("/holdings", "/"), ("/trades", "/ai"), ("/decisions", "/ai")]:
        r = client.get(path, follow_redirects=False)
        assert r.status_code == 303, path
        assert dest in r.headers["location"], path


def test_dashboard_status_json():
    client = TestClient(app)
    r = client.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "equity" in data
    assert "goal" in data
    assert "kill_switch" in data
    assert "broker" in data


def test_set_goal(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("", encoding="utf-8")
    monkeypatch.setattr("oracle.execution.live_setup.env_path", lambda: env)
    client = TestClient(app)
    r = client.post("/actions/set_goal", data={"goal": "150"}, follow_redirects=False)
    assert r.status_code == 303
    assert "/ai" in r.headers["location"]
    assert "ORACLE_GOAL_EQUITY=150.00" in env.read_text(encoding="utf-8")


def test_kill_switch_toggle():
    client = TestClient(app)
    r = client.post("/actions/kill", data={"active": "1"}, follow_redirects=False)
    assert r.status_code == 303
    assert "/settings" in r.headers["location"]
    r2 = client.get("/settings")
    assert "정지" in r2.text or "긴급정지" in r2.text
    r3 = client.post("/actions/kill", data={"active": "0"}, follow_redirects=False)
    assert r3.status_code == 303


def test_plan_trades_starts_job():
    client = TestClient(app)
    r = client.post("/actions/plan_trades", follow_redirects=False)
    assert r.status_code == 303
    assert r.headers["location"].startswith("/job/")


def test_practice_order_and_approve():
    client = TestClient(app)
    client.post("/actions/kill", data={"active": "0"}, follow_redirects=False)
    r = client.post("/actions/practice_order", follow_redirects=False)
    assert r.status_code == 303
    assert "/ai" in r.headers["location"]
    page = client.get("/ai")
    assert "승인" in page.text or "연습" in page.text or "기록" in page.text
