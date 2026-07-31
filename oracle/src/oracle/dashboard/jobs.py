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
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs (id, kind, status, message, created_at, finished_at, payload)
                VALUES (?, ?, 'queued', ?, ?, NULL, NULL)
                """,
                (job_id, kind, message, _now()),
            )
        return job_id

    def update(
        self,
        job_id: str,
        *,
        status: str | None = None,
        message: str | None = None,
        payload: dict | None = None,
        finished: bool = False,
    ) -> None:
        row = self.get(job_id)
        if not row:
            return
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
                    json.dumps(payload) if payload is not None else row["payload"],
                    _now() if finished else row["finished_at"],
                    job_id,
                ),
            )

    def get(self, job_id: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return dict(row) if row else None


def start_job(kind: str, fn, message: str = "작업 시작") -> str:
    """Create job row and run fn(job_id) in a daemon thread."""
    store = JobStore()
    job_id = store.create(kind, message=message)

    def _runner() -> None:
        store.update(job_id, status="running", message="실행 중…")
        try:
            result = fn(job_id)
            payload = result if isinstance(result, dict) else {"result": result}
            store.update(
                job_id,
                status="done",
                message=str(payload.get("message") or "완료"),
                payload=payload,
                finished=True,
            )
        except Exception as exc:
            store.update(
                job_id,
                status="error",
                message=f"실패: {exc}",
                payload={"error": str(exc), "trace": traceback.format_exc()[-2000:]},
                finished=True,
            )

    threading.Thread(target=_runner, daemon=True, name=f"oracle-job-{job_id}").start()
    return job_id
