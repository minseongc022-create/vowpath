"""Blog content autopilot store — JSON under Oracle data_dir."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from oracle.config import get_settings


def _root() -> Path:
    settings = get_settings()
    path = Path(settings.data_dir) / "content_blog"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _read(name: str, default: Any) -> Any:
    path = _root() / name
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _write(name: str, data: Any) -> None:
    path = _root() / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_connections() -> dict:
    return _read("connections.json", {})


def save_connections(data: dict) -> dict:
    _write("connections.json", data)
    return data


def load_settings() -> dict:
    return _read("settings.json", {})


def save_settings(patch: dict) -> dict:
    cur = load_settings()
    cur.update({k: v for k, v in patch.items() if v is not None and v != ""})
    _write("settings.json", cur)
    return cur


def load_inbox() -> dict | None:
    return _read("inbox.json", None)


def save_inbox(data: dict) -> None:
    _write("inbox.json", data)


def load_job() -> dict | None:
    return _read("job.json", None)


def save_job(data: dict) -> None:
    _write("job.json", data)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def ntfy_topic() -> str:
    s = load_settings()
    return (s.get("ntfy_topic") or os.getenv("NTFY_TOPIC") or "").strip()
