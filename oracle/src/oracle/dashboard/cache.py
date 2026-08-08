"""Simple TTL caches to keep dashboard snappy."""

from __future__ import annotations

import threading
import time
from typing import Any, Callable

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


def get_or_set(key: str, ttl_sec: float, factory: Callable[[], Any]) -> Any:
    now = time.time()
    with _lock:
        hit = _store.get(key)
        if hit and hit[0] > now:
            return hit[1]
    value = factory()
    with _lock:
        _store[key] = (now + ttl_sec, value)
    return value


def clear(prefix: str | None = None) -> None:
    with _lock:
        if prefix is None:
            _store.clear()
            return
        for k in list(_store):
            if k.startswith(prefix):
                _store.pop(k, None)
