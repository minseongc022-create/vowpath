"""Economic / earnings event calendar (YAML-driven for solo ops)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import yaml

from oracle.config import resolve_path


@dataclass
class CalendarEvent:
    date: date
    title: str
    category: str  # fomc | cpi | earnings | geopolitics | other
    symbols: list[str]
    importance: str  # high | medium | low
    notes: str = ""


def _parse_date(value: str | date) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def load_calendar(path: str | Path | None = None) -> list[CalendarEvent]:
    p = resolve_path(path or "config/calendar.yaml")
    if not p.exists():
        return []
    raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    events: list[CalendarEvent] = []
    for row in raw.get("events", []):
        events.append(
            CalendarEvent(
                date=_parse_date(row["date"]),
                title=str(row.get("title", "Event")),
                category=str(row.get("category", "other")),
                symbols=[str(s).upper() for s in row.get("symbols", [])],
                importance=str(row.get("importance", "medium")),
                notes=str(row.get("notes", "")),
            )
        )
    return sorted(events, key=lambda e: e.date)


def upcoming_events(days: int = 14, path: str | Path | None = None) -> list[CalendarEvent]:
    today = date.today()
    end = today + timedelta(days=days)
    return [e for e in load_calendar(path) if today <= e.date <= end]


def events_for_symbol(symbol: str, days: int = 21) -> list[CalendarEvent]:
    sym = symbol.upper()
    return [e for e in upcoming_events(days=days) if not e.symbols or sym in e.symbols]


def calendar_as_dicts(days: int = 21) -> list[dict]:
    return [
        {
            "date": e.date.isoformat(),
            "title": e.title,
            "category": e.category,
            "symbols": e.symbols,
            "importance": e.importance,
            "notes": e.notes,
        }
        for e in upcoming_events(days=days)
    ]
