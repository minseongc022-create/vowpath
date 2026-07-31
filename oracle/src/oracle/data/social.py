"""Social sentiment adapters — Stocktwits public stream + optional Reddit.

Missing credentials → empty results (never invent buzz).
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass

import httpx

logger = logging.getLogger("oracle.data.social")

BULL = {"bullish", "calls", "moon", "long", "buy", "breakout", "rocket"}
BEAR = {"bearish", "puts", "short", "sell", "crash", "dump", "bagholders"}


@dataclass
class SocialPost:
    source: str
    symbol: str
    text: str
    bullish: bool | None = None


def _score_text(text: str) -> float:
    tokens = set(re.findall(r"[a-zA-Z']+", text.lower()))
    b = len(tokens & BULL)
    s = len(tokens & BEAR)
    if b + s == 0:
        return 0.0
    return (b - s) / (b + s)


def fetch_stocktwits(symbol: str, limit: int = 30) -> list[SocialPost]:
    url = f"https://api.stocktwits.com/api/2/streams/symbol/{symbol}.json"
    posts: list[SocialPost] = []
    try:
        r = httpx.get(url, timeout=15.0, headers={"User-Agent": "ProjectOracle/1.0"})
        if r.status_code != 200:
            logger.info("stocktwits %s status=%s", symbol, r.status_code)
            return posts
        data = r.json()
        for msg in (data.get("messages") or [])[:limit]:
            body = msg.get("body") or ""
            sentiment = (msg.get("entities") or {}).get("sentiment") or {}
            basic = sentiment.get("basic")
            bullish = None
            if basic == "Bullish":
                bullish = True
            elif basic == "Bearish":
                bullish = False
            posts.append(SocialPost(source="stocktwits", symbol=symbol, text=body, bullish=bullish))
    except Exception as exc:
        logger.warning("stocktwits failed %s: %s", symbol, exc)
    return posts


def fetch_reddit(symbol: str, limit: int = 25) -> list[SocialPost]:
    client_id = os.getenv("REDDIT_CLIENT_ID", "").strip()
    client_secret = os.getenv("REDDIT_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return []
    try:
        auth = httpx.BasicAuth(client_id, client_secret)
        token_res = httpx.post(
            "https://www.reddit.com/api/v1/access_token",
            data={"grant_type": "client_credentials"},
            auth=auth,
            headers={"User-Agent": "ProjectOracle/1.0"},
            timeout=15.0,
        )
        token_res.raise_for_status()
        token = token_res.json()["access_token"]
        headers = {"Authorization": f"bearer {token}", "User-Agent": "ProjectOracle/1.0"}
        q = f"${symbol} OR {symbol}"
        r = httpx.get(
            "https://oauth.reddit.com/r/stocks+investing+wallstreetbets/search",
            params={"q": q, "restrict_sr": True, "sort": "new", "limit": limit, "t": "week"},
            headers=headers,
            timeout=20.0,
        )
        r.raise_for_status()
        posts: list[SocialPost] = []
        for child in (r.json().get("data") or {}).get("children") or []:
            d = child.get("data") or {}
            title = d.get("title") or ""
            selftext = d.get("selftext") or ""
            posts.append(
                SocialPost(
                    source="reddit",
                    symbol=symbol,
                    text=f"{title}\n{selftext}"[:500],
                )
            )
        return posts
    except Exception as exc:
        logger.warning("reddit failed %s: %s", symbol, exc)
        return []


def social_sentiment_score(symbol: str) -> tuple[float, dict]:
    """Return score in [-1,1] + metadata. 0 if no coverage."""
    st = fetch_stocktwits(symbol)
    rd = fetch_reddit(symbol)
    scores: list[float] = []
    labeled = 0
    for p in st:
        if p.bullish is True:
            scores.append(1.0)
            labeled += 1
        elif p.bullish is False:
            scores.append(-1.0)
            labeled += 1
        else:
            scores.append(_score_text(p.text) * 0.5)
    for p in rd:
        scores.append(_score_text(p.text) * 0.6)
    if not scores:
        return 0.0, {"coverage": 0, "stocktwits": 0, "reddit": 0}
    score = sum(scores) / len(scores)
    meta = {
        "coverage": len(scores),
        "stocktwits": len(st),
        "reddit": len(rd),
        "labeled": labeled,
        "extreme": abs(score) >= 0.65 and len(scores) >= 8,
    }
    return max(-1.0, min(1.0, score)), meta
