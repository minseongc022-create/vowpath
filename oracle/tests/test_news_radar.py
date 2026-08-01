"""News store + materiality + prep-mode helpers."""

from __future__ import annotations

from datetime import UTC, datetime

from oracle.config import clear_settings_cache
from oracle.data.news import Headline, NewsStore, material_score, poll_and_ingest
from oracle.execution import autopilot as ap


def test_material_score_flags_events():
    assert material_score("Company beats earnings, shares surge") >= 0.3
    assert material_score("Quiet product page update") < 0.25


def test_news_store_dedupes_and_take_fresh(tmp_path):
    store = NewsStore(tmp_path / "news.db")
    title = "NVDA beats estimates as AI demand surges"
    h1 = Headline(
        title=title,
        publisher="TestWire",
        link="https://example.com/1",
        published_at=datetime.now(UTC),
        symbol="NVDA",
        material_score=material_score(title),
    )
    h2 = Headline(
        title=title,
        publisher="TestWire",
        link="https://example.com/1",
        published_at=datetime.now(UTC),
        symbol="NVDA",
        material_score=h1.material_score,
    )
    fresh1 = store.ingest([h1])
    fresh2 = store.ingest([h2])
    assert len(fresh1) == 1
    assert fresh2 == []
    rows = store.take_fresh(limit=5, min_material=0.1)
    assert len(rows) == 1
    assert rows[0]["symbol"] == "NVDA"
    assert store.take_fresh(limit=5, min_material=0.1) == []


def test_us_session_has_label():
    sess = ap.us_equity_session()
    assert "open" in sess and "label" in sess and "hint" in sess


def test_poll_and_ingest_stores_fresh(monkeypatch, tmp_path):
    monkeypatch.setenv("ORACLE_DATA_DIR", str(tmp_path))
    clear_settings_cache()
    monkeypatch.setattr(
        "oracle.data.news.fetch_symbol_news",
        lambda symbol, limit=8: [
            Headline(
                title=f"{symbol} upgrade sparks rally",
                publisher="Unit",
                link=None,
                published_at=datetime.now(UTC),
                symbol=symbol,
                material_score=0.5,
            )
        ],
    )
    out = poll_and_ingest(["AAPL"], per_symbol=2, include_macro=False)
    assert out["fetched"] >= 1
    assert out["new"] >= 1
    clear_settings_cache()
