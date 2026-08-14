"""Background blog autopilot — text-only posts on a fixed interval."""

from __future__ import annotations

import logging
import os
import threading
import time
from dataclasses import dataclass

from oracle.content_blog import store

logger = logging.getLogger("oracle.content_blog.scheduler")

DEFAULT_INTERVAL_SEC = 7200  # 2 hours

_lock = threading.Lock()
_thread: threading.Thread | None = None
_stop = threading.Event()
_busy = False
_last_run_at: str | None = None
_last_message: str | None = None
_last_error: str | None = None


@dataclass
class BlogAutopilotStatus:
    enabled: bool
    interval_sec: int
    busy: bool
    last_run_at: str | None
    last_message: str | None
    last_error: str | None


def _env_on(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes"}


def enabled() -> bool:
    s = store.load_settings()
    if "auto_enabled" in s:
        return bool(s.get("auto_enabled"))
    return _env_on("ORACLE_BLOG_AUTO") or True


def interval_sec() -> int:
    s = store.load_settings()
    raw = s.get("auto_interval_sec")
    if raw is not None:
        try:
            return max(300, int(raw))
        except (TypeError, ValueError):
            pass
    try:
        return max(300, int(os.getenv("ORACLE_BLOG_INTERVAL_SEC", str(DEFAULT_INTERVAL_SEC))))
    except ValueError:
        return DEFAULT_INTERVAL_SEC


def status() -> BlogAutopilotStatus:
    return BlogAutopilotStatus(
        enabled=enabled(),
        interval_sec=interval_sec(),
        busy=_busy,
        last_run_at=_last_run_at,
        last_message=_last_message,
        last_error=_last_error,
    )


def run_once(*, source: str = "auto") -> dict | None:
    """Generate + publish if no run is already in progress."""
    global _busy, _last_run_at, _last_message, _last_error

    cur = store.load_job() or {}
    if cur.get("status") == "running" or _busy:
        logger.info("blog autopilot skip — job already running")
        return None

    with _lock:
        if _busy or (store.load_job() or {}).get("status") == "running":
            return None
        _busy = True

    from oracle.content_blog.engine import generate_all

    started = store.now_iso()
    store.save_job(
        {
            "id": f"auto-{started}",
            "status": "running",
            "startedAt": started,
            "message": f"자동 생성 시작 ({source})…",
            "source": source,
        }
    )
    _last_run_at = started
    _last_message = f"자동 생성 시작 ({source})"
    _last_error = None

    try:
        result = generate_all(live=True)
        n = len(result.get("results") or [])
        published = sum(1 for r in (result.get("results") or []) if r.get("published"))
        msg = f"자동 완료 · {n}편 · 발행 {published}"
        _last_message = msg
        if result.get("status") != "done":
            err = result.get("error") or "블로그 자동 생성 실패"
            _last_error = err
            store.save_job(
                {
                    **(store.load_job() or {}),
                    "status": "error",
                    "error": err,
                    "finishedAt": store.now_iso(),
                    "source": source,
                }
            )
        else:
            store.save_job(
                {
                    **(store.load_job() or {}),
                    "status": "done",
                    "message": msg,
                    "finishedAt": store.now_iso(),
                    "results": result.get("results") or [],
                    "source": source,
                }
            )
        return result
    except Exception as exc:
        logger.exception("blog autopilot cycle failed")
        _last_error = str(exc)
        store.save_job(
            {
                **(store.load_job() or {}),
                "status": "error",
                "error": str(exc),
                "finishedAt": store.now_iso(),
                "source": source,
            }
        )
        return None
    finally:
        _busy = False


def _loop() -> None:
    wait = interval_sec()
    logger.info("Blog autopilot loop start interval=%ss enabled=%s", wait, enabled())
    time.sleep(15)
    while not _stop.is_set():
        if enabled():
            try:
                run_once(source="auto")
            except Exception:
                logger.exception("blog autopilot loop error")
        _stop.wait(interval_sec() if enabled() else max(60, interval_sec()))


def start_background() -> None:
    global _thread
    with _lock:
        if _thread and _thread.is_alive():
            return
        _stop.clear()
        _thread = threading.Thread(target=_loop, daemon=True, name="oracle-blog-autopilot")
        _thread.start()
        logger.info("Blog autopilot background thread started")
