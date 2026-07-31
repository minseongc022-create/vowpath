"""Persist broker credentials + live arming into oracle/.env safely."""

from __future__ import annotations

import os
import re
from pathlib import Path

from oracle.config import _repo_root


def env_path() -> Path:
    # Prefer CWD/oracle/.env when running from oracle/
    cwd = Path.cwd() / ".env"
    if cwd.exists() or (Path.cwd() / "config").exists():
        return cwd
    return _repo_root() / ".env"


def _read_env_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return path.read_text(encoding="utf-8").splitlines()


def upsert_env(updates: dict[str, str], path: Path | None = None) -> Path:
    """Create/update KEY=VALUE lines in .env and os.environ."""
    path = path or env_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = _read_env_lines(path)
    keys_seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", line)
        if m and m.group(1) in updates:
            key = m.group(1)
            out.append(f"{key}={updates[key]}")
            keys_seen.add(key)
            os.environ[key] = updates[key]
        else:
            out.append(line)
    for key, val in updates.items():
        if key not in keys_seen:
            out.append(f"{key}={val}")
            os.environ[key] = val
    text = "\n".join(out).rstrip() + "\n"
    path.write_text(text, encoding="utf-8")
    return path


def live_armed() -> bool:
    return os.getenv("ORACLE_LIVE_TRADING", "").strip().lower() in {"1", "true", "yes"}


def live_max_notional() -> float:
    try:
        return float(os.getenv("ORACLE_LIVE_MAX_NOTIONAL", "75"))
    except ValueError:
        return 75.0


def first_trade_notional() -> float:
    try:
        return float(os.getenv("ORACLE_FIRST_TRADE_NOTIONAL", "25"))
    except ValueError:
        return 25.0
