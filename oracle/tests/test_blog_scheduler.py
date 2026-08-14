"""Tests for blog content autopilot scheduler."""

from oracle.content_blog import store


def test_blog_settings_defaults_auto_on(monkeypatch, tmp_path):
    monkeypatch.setenv("ORACLE_DATA_DIR", str(tmp_path))
    s = store.load_settings()
    assert s["auto_enabled"] is True
    assert s["auto_interval_sec"] == 7200


def test_blog_scheduler_skips_when_busy(monkeypatch, tmp_path):
    monkeypatch.setenv("ORACLE_DATA_DIR", str(tmp_path))
    store.save_job({"status": "running", "message": "test"})
    from oracle.content_blog import scheduler as sched

    assert sched.run_once() is None
