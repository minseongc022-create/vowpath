"""Background job store for long dashboard actions."""

from __future__ import annotations

import json
import sqlite3
import threading
import traceback
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from oracle.config import get_settings


def _now() -> str:
    return datetime.now(UTC).isoformat()


@dataclass
class Job:
    id: str
    kind: str
    status: str  # queued | running | done | error
    message: str
    created_at: str
    finished_at: str | None = None
    payload: dict | None = None


class JobStore:
    def __init__(self, db_path: str | Path | None = None) -> None:
        settings = get_settings()
        self.path = Path(db_path or Path(settings.data_dir) / "jobs.db")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, timeout=30)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    kind TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    finished_at TEXT,
                    payload TEXT
                )
                """
            )

    def create(self, kind: str, message: str = "대기 중") -> str:
        job_id = uuid.uuid4().hex[:12]
        payload = json.dumps({"logs": [{"ts": _now(), "text": message}]}, ensure_ascii=False)
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (id, kind, status, message, created_at, finished_at, payload)
                VALUES (?, ?, 'queued', ?, ?, NULL, ?)
                """,
                (job_id, kind, message, _now(), payload),
            )
        return job_id

    def _payload_of(self, row: dict) -> dict:
        raw = row.get("payload")
        if isinstance(raw, str) and raw:
            try:
                data = json.loads(raw)
                return data if isinstance(data, dict) else {}
            except Exception:
                return {}
        if isinstance(raw, dict):
            return dict(raw)
        return {}

    def update(
        self,
        job_id: str,
        *,
        status: str | None = None,
        message: str | None = None,
        payload: dict | None = None,
        finished: bool = False,
        merge_payload: bool = True,
    ) -> None:
        row = self.get(job_id)
        if not row:
            return
        current = self._payload_of(row)
        if payload is not None:
            if merge_payload:
                logs = list(current.get("logs") or [])
                incoming_logs = payload.get("logs")
                current.update(payload)
                if incoming_logs is None and logs:
                    current["logs"] = logs
            else:
                current = dict(payload)
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET status=?, message=?, payload=?, finished_at=?
                WHERE id=?
                """,
                (
                    status or row["status"],
                    message if message is not None else row["message"],
                    json.dumps(current, ensure_ascii=False),
                    _now() if finished else row["finished_at"],
                    job_id,
                ),
            )

    def append_log(self, job_id: str, text: str, *, status: str | None = "running") -> None:
        """Push a human-visible progress line (also updates message)."""
        row = self.get(job_id)
        if not row:
            return
        payload = self._payload_of(row)
        logs = list(payload.get("logs") or [])
        line = str(text).strip()
        if not line:
            return
        if logs and logs[-1].get("text") == line:
            self.update(job_id, status=status, message=line, payload=payload)
            return
        logs.append({"ts": _now(), "text": line})
        payload["logs"] = logs[-48:]
        self.update(job_id, status=status, message=line, payload=payload)

    def get(self, job_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return dict(row) if row else None


def start_job(kind: str, fn, message: str = "작업 시작") -> str:
    """Create job row and run fn(job_id) in a daemon thread.

    fn may call JobStore().append_log(job_id, ...) for live progress.
    """
    store = JobStore()
    job_id = store.create(kind, message=message)

    def _runner() -> None:
        store.update(job_id, status="running", message=message)
        try:
            result = fn(job_id)
            payload = result if isinstance(result, dict) else {"result": result}
            # Preserve logs already written during the run
            existing = store._payload_of(store.get(job_id) or {})
            logs = list(existing.get("logs") or [])
            extra = payload.get("logs")
            if isinstance(extra, list):
                logs.extend(extra)
            payload["logs"] = logs[-48:]
            done_msg = str(payload.get("message") or "완료")
            logs.append({"ts": _now(), "text": done_msg})
            payload["logs"] = logs[-48:]
            store.update(
                job_id,
                status="done",
                message=done_msg,
                payload=payload,
                finished=True,
            )
        except Exception as exc:
            store.append_log(job_id, f"실패: {exc}", status="error")
            existing = store._payload_of(store.get(job_id) or {})
            store.update(
                job_id,
                status="error",
                message=f"실패: {exc}",
                payload={
                    **existing,
                    "error": str(exc),
                    "trace": traceback.format_exc()[-2000:],
                },
                finished=True,
            )

    threading.Thread(target=_runner, daemon=True, name=f"oracle-job-{job_id}").start()
    return job_id
