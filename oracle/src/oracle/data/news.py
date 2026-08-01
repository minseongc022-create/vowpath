"""News ingest — Yahoo (yfinance) + optional NewsAPI, with persistent store.

Always-on radar: poll → dedupe → flag fresh material headlines for autopilot.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Callable

import yfinance as yf

from oracle.config import get_settings

logger = logging.getLogger("oracle.data.news")

_store_lock = threading.Lock()
_poller_thread: threading.Thread | None = None
_poller_stop = threading.Event()
_last_poll: dict[str, Any] = {
    "ts": None,
    "fetched": 0,
    "new": 0,
    "material": 0,
    "message": "뉴스 레이더 대기",
}

# Lexicon for materiality / alert priority (shared spirit with SentimentAgent)
_BULL = {
    "beat", "beats", "surge", "rally", "upgrade", "record", "growth", "bullish",
    "outperform", "soar", "soars", "optimistic", "breakthrough", "approval",
    "partnership", "buyback", "raise", "raises", "guidance",
}
_BEAR = {
    "miss", "misses", "cut", "cuts", "downgrade", "lawsuit", "probe", "fraud",
    "recession", "crash", "fear", "panic", "weak", "slump", "bearish", "war",
    "sanction", "bankruptcy", "investigation", "halt", "recall", "default",
    "layoffs", "warning", "guidance cut",
}
_MATERIAL = _BULL | _BEAR | {
    "earnings", "fda", "merger", "acquire", "acquisition", "ipo", "sec",
    "fed", "rate", "inflation", "tariff", "geopolit", "ceo", "cfo",
}


@dataclass
class Headline:
    title: str
    publisher: str | None
    link: str | None
    published_at: datetime | None
    symbol: str | None = None
    material_score: float = 0.0
    is_new: bool = False

    def fingerprint(self) -> str:
        key = f"{(self.symbol or '').upper()}|{(self.title or '').strip().lower()}"
        return hashlib.sha1(key.encode("utf-8")).hexdigest()[:24]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", (text or "").lower())


def material_score(title: str) -> float:
    """0..1 how actionable/urgent a headline looks."""
    tokens = set(_tokenize(title))
    if not tokens:
        return 0.0
    bull = len(tokens & _BULL)
    bear = len(tokens & _BEAR)
    mat = len(tokens & _MATERIAL)
    raw = (bull + bear) * 0.22 + mat * 0.12
    # Extra weight if both sides fire (conflict / eventful)
    if bull and bear:
        raw += 0.15
    return float(min(1.0, raw))


def fetch_symbol_news(symbol: str, limit: int = 8) -> list[Headline]:
    headlines: list[Headline] = []
    try:
        items = yf.Ticker(symbol).news or []
    except Exception as exc:
        logger.warning("news fetch failed for %s: %s", symbol, exc)
        return headlines

    for item in items[:limit]:
        content = item.get("content") if isinstance(item.get("content"), dict) else None
        if content:
            title = content.get("title") or ""
            publisher = (content.get("provider") or {}).get("displayName")
            link = (content.get("canonicalUrl") or {}).get("url")
            pub = content.get("pubDate")
        else:
            title = item.get("title") or ""
            publisher = item.get("publisher")
            link = item.get("link")
            pub = item.get("providerPublishTime")

        published_at = None
        if isinstance(pub, (int, float)):
            published_at = datetime.fromtimestamp(pub, tz=UTC)
        elif isinstance(pub, str):
            try:
                published_at = datetime.fromisoformat(pub.replace("Z", "+00:00"))
            except ValueError:
                published_at = None

        if title:
            headlines.append(
                Headline(
                    title=title,
                    publisher=publisher,
                    link=link,
                    published_at=published_at,
                    symbol=symbol,
                    material_score=material_score(title),
                )
            )
    return headlines


def _fetch_newsapi(query: str, limit: int = 10) -> list[Headline]:
    key = (os.getenv("NEWSAPI_KEY") or "").strip()
    if not key:
        return []
    params = urllib.parse.urlencode(
        {
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": min(limit, 20),
            "apiKey": key,
        }
    )
    url = f"https://newsapi.org/v2/everything?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "OracleNews/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        logger.debug("NewsAPI fetch failed: %s", exc)
        return []
    out: list[Headline] = []
    for art in payload.get("articles") or []:
        title = (art.get("title") or "").strip()
        if not title or title == "[Removed]":
            continue
        pub_raw = art.get("publishedAt")
        published_at = None
        if isinstance(pub_raw, str):
            try:
                published_at = datetime.fromisoformat(pub_raw.replace("Z", "+00:00"))
            except ValueError:
                published_at = None
        out.append(
            Headline(
                title=title,
                publisher=(art.get("source") or {}).get("name"),
                link=art.get("url"),
                published_at=published_at,
                symbol=None,
                material_score=material_score(title),
            )
        )
    return out


def aggregate_market_headlines(symbols: list[str], per_symbol: int = 3) -> list[Headline]:
    seen: set[str] = set()
    out: list[Headline] = []
    for s in symbols:
        for h in fetch_symbol_news(s, limit=per_symbol):
            key = h.title.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(h)
    return out


class NewsStore:
    """SQLite headline memory — dedupe + fresh flags for ASAP analysis."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        settings = get_settings()
        self.path = Path(db_path or Path(settings.data_dir) / "news.db")
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
                CREATE TABLE IF NOT EXISTS headlines (
                    id TEXT PRIMARY KEY,
                    symbol TEXT,
                    title TEXT NOT NULL,
                    publisher TEXT,
                    link TEXT,
                    published_at TEXT,
                    fetched_at TEXT NOT NULL,
                    material REAL DEFAULT 0,
                    analyzed INTEGER DEFAULT 0
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_news_fetched ON headlines(fetched_at DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_news_analyzed ON headlines(analyzed, material DESC)"
            )

    def ingest(self, headlines: list[Headline]) -> list[Headline]:
        """Insert unseen headlines; return only the newly stored ones."""
        if not headlines:
            return []
        now = datetime.now(UTC).isoformat()
        fresh: list[Headline] = []
        with _store_lock:
            with self._connect() as conn:
                for h in headlines:
                    fp = h.fingerprint()
                    exists = conn.execute(
                        "SELECT 1 FROM headlines WHERE id = ?", (fp,)
                    ).fetchone()
                    if exists:
                        continue
                    conn.execute(
                        """
                        INSERT INTO headlines
                        (id, symbol, title, publisher, link, published_at, fetched_at, material, analyzed)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                        """,
                        (
                            fp,
                            (h.symbol or "").upper() or None,
                            h.title.strip()[:400],
                            (h.publisher or "")[:120] or None,
                            (h.link or "")[:500] or None,
                            h.published_at.isoformat() if h.published_at else None,
                            now,
                            float(h.material_score or material_score(h.title)),
                        ),
                    )
                    h.is_new = True
                    h.material_score = float(h.material_score or material_score(h.title))
                    fresh.append(h)
        return fresh

    def mark_analyzed(self, ids: list[str]) -> None:
        if not ids:
            return
        with _store_lock:
            with self._connect() as conn:
                conn.executemany(
                    "UPDATE headlines SET analyzed = 1 WHERE id = ?",
                    [(i,) for i in ids],
                )

    def take_fresh(
        self,
        *,
        limit: int = 16,
        min_material: float = 0.15,
        mark: bool = True,
    ) -> list[dict[str, Any]]:
        """Pop unanalyzed material headlines for the next research/trade cycle."""
        with _store_lock:
            with self._connect() as conn:
                rows = conn.execute(
                    """
                    SELECT id, symbol, title, publisher, link, published_at, material, fetched_at
                    FROM headlines
                    WHERE analyzed = 0 AND material >= ?
                    ORDER BY material DESC, fetched_at DESC
                    LIMIT ?
                    """,
                    (min_material, limit),
                ).fetchall()
                items = [dict(r) for r in rows]
                if mark and items:
                    conn.executemany(
                        "UPDATE headlines SET analyzed = 1 WHERE id = ?",
                        [(r["id"],) for r in items],
                    )
        return items

    def recent(self, *, limit: int = 20, symbol: str | None = None) -> list[dict[str, Any]]:
        with _store_lock:
            with self._connect() as conn:
                if symbol:
                    rows = conn.execute(
                        """
                        SELECT id, symbol, title, publisher, link, published_at, material, fetched_at, analyzed
                        FROM headlines WHERE symbol = ?
                        ORDER BY fetched_at DESC LIMIT ?
                        """,
                        (symbol.upper(), limit),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT id, symbol, title, publisher, link, published_at, material, fetched_at, analyzed
                        FROM headlines
                        ORDER BY fetched_at DESC LIMIT ?
                        """,
                        (limit,),
                    ).fetchall()
        return [dict(r) for r in rows]

    def stats(self) -> dict[str, Any]:
        with _store_lock:
            with self._connect() as conn:
                total = conn.execute("SELECT COUNT(*) AS c FROM headlines").fetchone()["c"]
                pending = conn.execute(
                    "SELECT COUNT(*) AS c FROM headlines WHERE analyzed = 0"
                ).fetchone()["c"]
                material = conn.execute(
                    "SELECT COUNT(*) AS c FROM headlines WHERE analyzed = 0 AND material >= 0.2"
                ).fetchone()["c"]
        return {
            "total": int(total),
            "pending": int(pending),
            "material_pending": int(material),
            "last_poll": dict(_last_poll),
        }


def research_digest(limit: int = 10) -> str:
    """Compact FACT string for LLM / situation line."""
    rows = NewsStore().recent(limit=limit)
    if not rows:
        return "No stored headlines yet"
    bits = []
    for r in rows[:limit]:
        sym = r.get("symbol") or "?"
        title = (r.get("title") or "")[:120]
        bits.append(f"[{sym}] {title}")
    return " | ".join(bits)


def poll_and_ingest(
    symbols: list[str],
    *,
    per_symbol: int = 6,
    include_macro: bool = True,
) -> dict[str, Any]:
    """Fetch + store news for symbols; returns counts and fresh list."""
    syms = list(dict.fromkeys(s.upper() for s in symbols if s))
    if include_macro:
        for m in ("SPY", "QQQ", "^VIX", "IWM"):
            if m not in syms:
                syms.append(m)
    collected: list[Headline] = []
    for s in syms:
        # Indices: strip ^ for yfinance when needed
        ticker = s
        collected.extend(fetch_symbol_news(ticker, limit=per_symbol))
    # Optional broad NewsAPI sweep (markets / macro)
    if os.getenv("NEWSAPI_KEY"):
        for q in ("stock market", "Federal Reserve", "earnings"):
            for h in _fetch_newsapi(q, limit=6):
                h.symbol = h.symbol or "MACRO"
                collected.append(h)

    store = NewsStore()
    fresh = store.ingest(collected)
    material_new = [h for h in fresh if h.material_score >= 0.2]
    _last_poll.update(
        {
            "ts": datetime.now(UTC).isoformat(),
            "fetched": len(collected),
            "new": len(fresh),
            "material": len(material_new),
            "message": (
                f"뉴스 수집 · 조회 {len(collected)} · 신규 {len(fresh)} · "
                f"중요 {len(material_new)}"
            ),
        }
    )
    return {
        "fetched": len(collected),
        "new": len(fresh),
        "material": len(material_new),
        "fresh": fresh,
        "material_fresh": material_new,
        "stats": store.stats(),
    }


def radar_status() -> dict[str, Any]:
    st = NewsStore().stats()
    st["poller_alive"] = bool(_poller_thread and _poller_thread.is_alive())
    return st


def start_news_poller(
    *,
    interval_sec: int = 45,
    on_fresh: Callable[[list[Headline]], None] | None = None,
    symbols_fn: Callable[[], list[str]] | None = None,
) -> None:
    """Background news radar — independent of trade cycle length."""
    global _poller_thread
    if _poller_thread and _poller_thread.is_alive():
        return

    def _default_symbols() -> list[str]:
        try:
            from oracle.portfolio.picker import load_trade_universe
            from oracle.portfolio.store import load_portfolio

            settings = get_settings()
            held = list(load_portfolio(settings.portfolio_path).held_symbols())
            uni = load_trade_universe()[:40]
            return list(dict.fromkeys([*held, *uni, "SPY", "QQQ"]))
        except Exception:
            return ["SPY", "QQQ", "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META"]

    def _loop() -> None:
        logger.info("News radar started interval=%ss", interval_sec)
        # First poll quickly
        time.sleep(2)
        while not _poller_stop.is_set():
            try:
                syms = (symbols_fn or _default_symbols)()
                result = poll_and_ingest(syms, per_symbol=5, include_macro=True)
                fresh = result.get("material_fresh") or []
                if fresh and on_fresh:
                    try:
                        on_fresh(fresh)
                    except Exception:
                        logger.debug("on_fresh callback failed", exc_info=True)
            except Exception:
                logger.exception("news poller cycle failed")
            _poller_stop.wait(max(20, interval_sec))
        logger.info("News radar stopped")

    _poller_stop.clear()
    _poller_thread = threading.Thread(target=_loop, daemon=True, name="oracle-news-radar")
    _poller_thread.start()


def stop_news_poller() -> None:
    _poller_stop.set()
