"""Job progress log store tests."""

from __future__ import annotations

from oracle.dashboard.jobs import JobStore


def test_append_log_updates_message(tmp_path):
    store = JobStore(tmp_path / "jobs.db")
    jid = store.create("autopilot", "시작")
    store.append_log(jid, "① 스크리닝")
    store.append_log(jid, "② AI")
    row = store.get(jid)
    assert row["message"] == "② AI"
    assert row["status"] == "running"
    import json

    payload = json.loads(row["payload"])
    texts = [x["text"] for x in payload["logs"]]
    assert "시작" in texts
    assert "① 스크리닝" in texts
    assert "② AI" in texts
