"""Real Korean search-demand signals for topic picking + charts.

Sources (no paid API required):
- Signal.bz realtime top10 (what people search/talk about now)
- Google Trends daily RSS (KR)
- Naver / Google autocomplete related queries (commercial intent depth)

Optional: NAVER_CLIENT_ID + NAVER_CLIENT_SECRET → DataLab search trend series.
"""

from __future__ import annotations

import json
import logging
import os
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

import httpx

from oracle.content_blog import store

logger = logging.getLogger("oracle.content_blog.trends")

UA = {
    "User-Agent": "Mozilla/5.0 (compatible; OracleBlogBot/1.3; +https://oracle.vowroad.com)"
}

# Commercial / high-CPC intent markers in autocomplete
COMMERCIAL_HINTS = (
    "금리",
    "한도",
    "비교",
    "환급",
    "보험료",
    "이자",
    "대출",
    "승인",
    "연봉",
    "이직",
    "세액",
    "공제",
    "청구",
    "특약",
    "SEO",
    "애드센스",
    "도메인",
    "호스팅",
)


@dataclass
class TrendPoint:
    label: str
    value: float


@dataclass
class TrendSnapshot:
    source: str
    fetched_at: str
    realtime: list[dict] = field(default_factory=list)  # {keyword, rank, traffic?}
    google_daily: list[dict] = field(default_factory=list)
    keyword_scores: dict[str, float] = field(default_factory=dict)
    series: dict[str, list[TrendPoint]] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "source": self.source,
            "fetchedAt": self.fetched_at,
            "realtime": self.realtime,
            "googleDaily": self.google_daily,
            "keywordScores": self.keyword_scores,
            "series": {
                k: [{"label": p.label, "value": p.value} for p in v]
                for k, v in self.series.items()
            },
            "notes": self.notes,
        }


def _parse_traffic(raw: str) -> int:
    m = re.search(r"([\d,]+)", raw or "")
    if not m:
        return 50
    return int(m.group(1).replace(",", ""))


def fetch_signal_realtime() -> list[dict]:
    try:
        r = httpx.get("https://api.signal.bz/news/realtime", headers=UA, timeout=12)
        r.raise_for_status()
        data = r.json()
        out = []
        for row in data.get("top10") or []:
            out.append(
                {
                    "keyword": (row.get("keyword") or "").strip(),
                    "rank": int(row.get("rank") or 0),
                    "state": row.get("state") or "",
                    "source": "signal.bz",
                }
            )
        return out
    except Exception as e:
        logger.warning("signal realtime failed: %s", e)
        return []


def fetch_google_daily_rss() -> list[dict]:
    try:
        r = httpx.get(
            "https://trends.google.com/trending/rss?geo=KR",
            headers=UA,
            timeout=15,
            follow_redirects=True,
        )
        r.raise_for_status()
        root = ET.fromstring(r.text)
        ns = {"ht": "https://trends.google.com/trending/rss"}
        out = []
        for item in root.findall("./channel/item"):
            title = (item.findtext("title") or "").strip()
            traffic = (item.findtext(f"{{{ns['ht']}}}approx_traffic") or "").strip()
            if not title:
                continue
            out.append(
                {
                    "keyword": title,
                    "traffic": traffic,
                    "trafficScore": _parse_traffic(traffic),
                    "source": "google-trends-rss",
                }
            )
        return out[:20]
    except Exception as e:
        logger.warning("google daily rss failed: %s", e)
        return []


def naver_related(keyword: str) -> list[str]:
    try:
        r = httpx.get(
            "https://ac.search.naver.com/nx/ac",
            params={
                "q": keyword,
                "con": 1,
                "frm": "nx",
                "ans": 2,
                "r_format": "json",
                "r_enc": "UTF-8",
                "r_unicode": 0,
                "t_koreng": 1,
                "q_enc": "UTF-8",
                "st": 100,
            },
            headers=UA,
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        items = data.get("items") or []
        if not items:
            return []
        # items[0] is list of [suggestion] lists
        flat = []
        for row in items[0]:
            if isinstance(row, list) and row:
                flat.append(str(row[0]))
            elif isinstance(row, str):
                flat.append(row)
        return flat
    except Exception as e:
        logger.debug("naver ac failed %s: %s", keyword, e)
        return []


def google_related(keyword: str) -> list[str]:
    try:
        r = httpx.get(
            "https://suggestqueries.google.com/complete/search",
            params={"client": "firefox", "hl": "ko", "q": keyword},
            headers=UA,
            timeout=10,
        )
        text = None
        for enc in ("utf-8", "euc-kr", "cp949"):
            try:
                text = r.content.decode(enc)
                break
            except Exception:
                continue
        if not text:
            return []
        data = json.loads(text)
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            return [str(x) for x in data[1][:12]]
        return []
    except Exception as e:
        logger.debug("google ac failed %s: %s", keyword, e)
        return []


def score_keyword(keyword: str, realtime: list[dict], google_daily: list[dict]) -> tuple[float, list[str], list[str]]:
    """Return (score, related, reasons). Higher = more write-worthy now."""
    related = naver_related(keyword) or google_related(keyword)
    reasons: list[str] = []
    score = 10.0 + min(len(related), 10) * 2.0

    commercial = sum(1 for r in related if any(h in r for h in COMMERCIAL_HINTS))
    score += commercial * 4.0
    if commercial:
        reasons.append(f"관련검색 상업의도 {commercial}건")

    # overlap with realtime / google daily (substring)
    blob_rt = " ".join(x.get("keyword", "") for x in realtime).lower()
    blob_g = " ".join(x.get("keyword", "") for x in google_daily).lower()
    kw_l = keyword.lower().replace(" ", "")
    for token in re.findall(r"[가-힣A-Za-z0-9]{2,}", keyword):
        if token.lower() in blob_rt:
            score += 25
            reasons.append(f"실시간 이슈 연관:{token}")
            break
    for g in google_daily[:12]:
        gkw = (g.get("keyword") or "").lower()
        if any(t.lower() in gkw for t in re.findall(r"[가-힣A-Za-z0-9]{2,}", keyword)):
            score += 12 + min(g.get("trafficScore", 0) / 100.0, 20)
            reasons.append(f"구글 급상승 근접:{g.get('keyword')}")
            break

    # light seasonal priors (KR)
    month = date.today().month
    seasonal = {
        "연말정산": {1, 2, 11, 12},
        "자동차보험": set(range(1, 13)),
        "이직": {1, 2, 3, 6, 7, 9, 10},
        "전세": {1, 2, 5, 6, 11, 12},
        "애드센스": set(range(1, 13)),
    }
    for key, months in seasonal.items():
        if key in keyword and month in months:
            score += 8
            reasons.append(f"시즌 수요:{key}")

    if not reasons:
        reasons.append("고단가·검색의도 후보")
    return score, related, reasons


def fetch_datalab_series(keywords: list[str]) -> dict[str, list[TrendPoint]]:
    cid = os.getenv("NAVER_CLIENT_ID") or os.getenv("X_NAVER_CLIENT_ID") or ""
    secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("X_NAVER_CLIENT_SECRET") or ""
    if not cid or not secret or not keywords:
        return {}
    end = date.today()
    start = end - timedelta(days=30)
    groups = [
        {"groupName": kw[:20], "keywords": [kw]}
        for kw in keywords[:5]
    ]
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "timeUnit": "date",
        "keywordGroups": groups,
    }
    try:
        r = httpx.post(
            "https://openapi.naver.com/v1/datalab/search",
            headers={
                **UA,
                "X-Naver-Client-Id": cid,
                "X-Naver-Client-Secret": secret,
                "Content-Type": "application/json",
            },
            json=body,
            timeout=20,
        )
        if r.status_code >= 300:
            logger.warning("datalab %s: %s", r.status_code, r.text[:160])
            return {}
        data = r.json()
        out: dict[str, list[TrendPoint]] = {}
        for res in data.get("results") or []:
            title = res.get("title") or ""
            pts = [
                TrendPoint(label=p.get("period", ""), value=float(p.get("ratio") or 0))
                for p in (res.get("data") or [])
            ]
            out[title] = pts
        return out
    except Exception as e:
        logger.warning("datalab failed: %s", e)
        return {}


def build_snapshot(candidate_keywords: list[str]) -> TrendSnapshot:
    snap = TrendSnapshot(source="multi", fetched_at=store.now_iso())
    snap.realtime = fetch_signal_realtime()
    snap.google_daily = fetch_google_daily_rss()
    scores: dict[str, float] = {}
    related_map: dict[str, list[str]] = {}
    reason_map: dict[str, list[str]] = {}
    for kw in candidate_keywords:
        sc, rel, reasons = score_keyword(kw, snap.realtime, snap.google_daily)
        scores[kw] = sc
        related_map[kw] = rel
        reason_map[kw] = reasons
    snap.keyword_scores = scores
    # series: prefer DataLab; else relative scores as single-bar comparison
    series = fetch_datalab_series(sorted(scores, key=scores.get, reverse=True)[:5])
    if series:
        snap.series = series
        snap.notes.append("네이버 데이터랩 30일 검색 추이")
    else:
        # Build a comparable "관심도 지수" chart from live scores (normalized 0-100)
        mx = max(scores.values()) if scores else 1.0
        ranked = sorted(scores.items(), key=lambda x: -x[1])[:6]
        snap.series = {
            "관심도지수": [
                TrendPoint(label=k, value=round(100.0 * v / mx, 1)) for k, v in ranked
            ]
        }
        snap.notes.append(
            "관심도지수 = 실시간(Signal) + 구글 급상승 RSS + 네이버/구글 관련검색 상업의도 합성"
        )
    # stash for UI
    store._write(  # noqa: SLF001
        "trends.json",
        {
            **snap.as_dict(),
            "related": related_map,
            "reasons": reason_map,
        },
    )
    return snap


def pick_best_keyword(candidates: list[str], used: set[str]) -> tuple[str, float, TrendSnapshot]:
    snap = build_snapshot(candidates)
    ranked = sorted(snap.keyword_scores.items(), key=lambda x: -x[1])
    for kw, sc in ranked:
        # skip if recently used as exact keyword
        if any(kw in u for u in used):
            continue
        return kw, sc, snap
    if ranked:
        return ranked[0][0], ranked[0][1], snap
    return candidates[0], 0.0, snap


def sparkline_values(snap: TrendSnapshot, keyword: str) -> list[tuple[str, float]]:
    if "관심도지수" in snap.series:
        return [(p.label, p.value) for p in snap.series["관심도지수"]]
    # datalab per-keyword
    for k, pts in snap.series.items():
        if keyword in k or k in keyword:
            return [(p.label[-5:], p.value) for p in pts[-14:]]
    # fallback first series
    if snap.series:
        k0 = next(iter(snap.series))
        return [(p.label, p.value) for p in snap.series[k0][:8]]
    return []
