"""Generate ChatGPT/Gemini-like blog images (situational, humorous, no faces).

Uses Pollinations (no API key) — returns JPEG files under content_blog/covers.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from urllib.parse import quote

import httpx

logger = logging.getLogger("oracle.content_blog.images")

UA = {"User-Agent": "OracleBlogBot/1.3.2"}


def _slug(s: str) -> str:
    s = re.sub(r"[^\w가-힣]+", "-", s).strip("-")
    return (s or "img")[:48]


def build_image_prompt(*, title: str, keyword: str, kind: str = "cover") -> str:
    """English prompt — models follow EN better; force no faces + humor + situation."""
    scene = {
        "cover": (
            "wide 16:9 editorial blog hero illustration, witty situational comedy, "
            "clean modern flat illustration with soft gradients, high detail, "
            "no text, no watermark, no logos"
        ),
        "mid": (
            "square-ish blog section illustration, humorous everyday situation, "
            "clean flat vector-like style, no text overlay"
        ),
        "chart": (
            "playful infographic-style illustration of people searching on phones "
            "as abstract shapes (no faces), rising interest bars as cute objects, "
            "no readable text"
        ),
    }.get(kind, "blog illustration")

    return (
        f"{scene}. Topic: {keyword}. Story angle: {title}. "
        "Show the SITUATION metaphorically (documents, phones, calendars, coins, "
        "houses, checklists, confused stick-figure silhouettes WITHOUT faces or "
        "identifiable people). Humorous, clever, professional enough for a blog. "
        "Absolutely no human faces, no photorealistic people, no celebrities, "
        "no gore, no NSFW."
    )


def generate_image(
    *,
    title: str,
    keyword: str,
    out_path: Path,
    kind: str = "cover",
    width: int = 1200,
    height: int = 630,
) -> Path | None:
    prompt = build_image_prompt(title=title, keyword=keyword, kind=kind)
    seed = int(hashlib.sha256(f"{kind}:{keyword}:{title}".encode()).hexdigest()[:8], 16) % 999999
    url = (
        "https://image.pollinations.ai/prompt/"
        + quote(prompt[:900])
        + f"?width={width}&height={height}&nologo=true&seed={seed}&model=flux"
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with httpx.Client(timeout=90.0, follow_redirects=True, headers=UA) as client:
            r = client.get(url)
            r.raise_for_status()
            ctype = (r.headers.get("content-type") or "").lower()
            data = r.content
            if len(data) < 2000:
                logger.warning("image too small for %s (%s bytes)", kind, len(data))
                return None
            # normalize extension
            if "png" in ctype:
                if out_path.suffix.lower() != ".png":
                    out_path = out_path.with_suffix(".png")
            else:
                if out_path.suffix.lower() not in {".jpg", ".jpeg"}:
                    out_path = out_path.with_suffix(".jpg")
            out_path.write_bytes(data)
            return out_path
    except Exception as e:
        logger.warning("image gen failed (%s): %s", kind, e)
        return None


def make_article_images(
    *,
    title: str,
    keyword: str,
    out_dir: Path,
    stem: str,
) -> dict[str, Path]:
    """Create cover + mid (+ optional chart-scene) images."""
    out: dict[str, Path] = {}
    cover = generate_image(
        title=title,
        keyword=keyword,
        out_path=out_dir / f"{stem}-cover.jpg",
        kind="cover",
        width=1200,
        height=630,
    )
    if cover:
        out["cover"] = cover
    mid = generate_image(
        title=title,
        keyword=keyword,
        out_path=out_dir / f"{stem}-mid.jpg",
        kind="mid",
        width=1200,
        height=800,
    )
    if mid:
        out["mid"] = mid
    chart = generate_image(
        title=f"search interest vibe for {keyword}",
        keyword=keyword,
        out_path=out_dir / f"{stem}-scene.jpg",
        kind="chart",
        width=1200,
        height=675,
    )
    if chart:
        out["scene"] = chart
    return out
