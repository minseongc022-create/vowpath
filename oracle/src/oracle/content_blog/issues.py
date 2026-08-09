"""Turn live search/issue signals into fact-first, clicky blog topics."""

from __future__ import annotations

import logging
import re
from dataclasses import replace

import httpx

from oracle.content_blog.titles import make_click_title
from oracle.content_blog.topics import Topic, topics_for
from oracle.content_blog.trends import (
    fetch_google_daily_rss,
    fetch_signal_realtime,
    google_related,
    naver_related,
)

logger = logging.getLogger("oracle.content_blog.issues")

UA = {"User-Agent": "OracleBlogBot/1.3.2"}

# Soft-block pure adult / harmful — keep entertainment + finance + news
BLOCK = re.compile(r"(야동|포르노|자살|폭탄제조|마약구매)", re.I)

CLICK_ANGLES = [
    "{kw}, 지금 사람들이 제일 많이 묻는 것부터 팩트로 정리",
    "{kw} 검색 폭주 — 확인된 사실만 골라 한 장에 정리",
    "갑자기 {kw} 찾는 이유? 헷갈리는 포인트만 정확히",
    "{kw}, 루머와 사실을 나눠보면 이게 핵심이다",
    "지금 이슈된 {kw} — 뭘 먼저 보면 되는지 순서 정리",
]


def _safe(kw: str) -> bool:
    k = (kw or "").strip()
    if len(k) < 2 or len(k) > 40:
        return False
    if BLOCK.search(k):
        return False
    return True


def _duckling_news_bits(keyword: str) -> list[str]:
    """Lightweight public news titles for fact framing (best-effort)."""
    try:
        r = httpx.get(
            "https://news.google.com/rss/search",
            params={"q": keyword, "hl": "ko", "gl": "KR", "ceid": "KR:ko"},
            headers=UA,
            timeout=12,
            follow_redirects=True,
        )
        if r.status_code >= 300:
            return []
        titles = re.findall(r"<title><!\[CDATA\[(.*?)\]\]></title>|<title>(.*?)</title>", r.text)
        out = []
        for a, b in titles:
            t = (a or b or "").strip()
            if not t or t.lower() == "google news":
                continue
            out.append(t)
            if len(out) >= 5:
                break
        return out
    except Exception as e:
        logger.debug("news rss failed: %s", e)
        return []


def _angle_title(keyword: str, related: list[str]) -> str:
    import random

    base = random.choice(CLICK_ANGLES).format(kw=keyword)
    # Keep primary keyword visible; related only as curiosity hook
    for r in related:
        if keyword in r and r != keyword and 4 < len(r) <= 22:
            base = f"{keyword}, '{r}'까지 검색하는 사람들이 놓치는 포인트"
            break
    return make_click_title(keyword, base, search_intent=f"{keyword} 이슈·검색 의도")

def live_issue_candidates(limit: int = 12) -> list[dict]:
    """Merge Signal realtime + Google daily into scored issue list."""
    signal = fetch_signal_realtime()
    google = fetch_google_daily_rss()
    seen: set[str] = set()
    rows: list[dict] = []

    for s in signal:
        kw = (s.get("keyword") or "").strip()
        if not _safe(kw) or kw in seen:
            continue
        seen.add(kw)
        rank = int(s.get("rank") or 99)
        rows.append(
            {
                "keyword": kw,
                "rank": rank,
                # Prefer Korea realtime board strongly
                "trafficScore": max(0, 400 - rank * 25),
                "source": "signal",
            }
        )
    for g in google:
        kw = (g.get("keyword") or "").strip()
        if not _safe(kw) or kw in seen:
            continue
        seen.add(kw)
        rows.append(
            {
                "keyword": kw,
                "rank": 50,
                "trafficScore": min(int(g.get("trafficScore") or 80), 180),
                "source": "google-trends",
            }
        )

    # enrich
    enriched = []
    for row in rows[:20]:
        kw = row["keyword"]
        related = naver_related(kw) or google_related(kw)
        news = _duckling_news_bits(kw)
        commercial = sum(
            1
            for r in related
            if any(h in r for h in ("금리", "가격", "환급", "보험", "대출", "신청", "방법", "뜻", "이유"))
        )
        score = float(row["trafficScore"]) + commercial * 6 + min(len(news), 4) * 3 + min(len(related), 8)
        enriched.append(
            {
                **row,
                "related": related[:10],
                "news": news,
                "score": score,
                "commercial": commercial,
            }
        )
    enriched.sort(key=lambda x: -x["score"])
    return enriched[:limit]


def topic_from_issue(issue: dict, platform: str) -> Topic:
    kw = issue["keyword"]
    related = list(issue.get("related") or [])
    news = list(issue.get("news") or [])
    title = _angle_title(kw, related)
    intent = f"실시간 검색·이슈 '{kw}'에 대한 사실 정리 / 궁금증 해소"
    outline = [
        "지금 왜 검색되나",
        "확인된 사실",
        "사람들이 헷갈리는 지점",
        "바로 확인할 순서",
        "자주 하는 착각",
        "체크리스트",
    ]
    # Platform flavor: naver=생활/이슈, wp=커리어 연결 가능하면, blogger=디지털
    secondary = [r for r in related if r != kw][:4]
    if news:
        secondary = (secondary + [news[0][:24]])[:5]
    return Topic(
        title=title,
        keyword=kw,
        secondary=secondary or [f"{kw} 정리", f"{kw} 사실"],
        search_intent=intent,
        outline=outline,
        cpc_tier="high" if issue.get("commercial", 0) >= 2 else "mid",
    )


def pick_issue_topic(platform: str, used: set[str]) -> tuple[Topic, dict]:
    """Prefer live issues; fall back to high-CPC bank if feeds empty."""
    issues = live_issue_candidates()
    for issue in issues:
        kw = issue["keyword"]
        if any(kw in u or u in kw for u in used):
            continue
        topic = topic_from_issue(issue, platform)
        return topic, issue

    # fallback: bank topic
    pool = topics_for(platform)
    for t in pool:
        if t.title in used or t.keyword in used:
            continue
        return replace(t, title=make_click_title(t.keyword, t.title, t.search_intent)), {
            "keyword": t.keyword,
            "related": t.secondary,
            "news": [],
            "score": 0,
            "source": "cpc-bank",
        }
    t = pool[0]
    return t, {"keyword": t.keyword, "related": t.secondary, "news": [], "score": 0, "source": "cpc-bank"}
