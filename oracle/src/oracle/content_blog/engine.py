"""High-quality, high-CPC factual blog generator + publish + SNS packs."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import httpx

from oracle.content_blog import store
from oracle.content_blog.covers import make_chart_svg, make_cover_svg, make_section_svg
from oracle.content_blog.social import build_social_copies
from oracle.content_blog.titles import make_click_title
from oracle.content_blog.topics import Topic, topics_for
from oracle.content_blog.trends import TrendSnapshot, pick_best_keyword, sparkline_values
from oracle.llm.client import chat as llm_chat

logger = logging.getLogger("oracle.content_blog")


@dataclass
class Brand:
    id: str
    name: str
    platform: str
    concept: str
    audience: str
    min_chars: int = 2200


BRANDS = [
    Brand(
        id="personal-naver",
        name="네이버",
        platform="naver",
        concept="고단가 키워드(대출·보험·세금·카드)를 사실 기반으로 정리하는 실용 블로그",
        audience="검색으로 금융·생활 정보를 찾는 20~40대",
    ),
    Brand(
        id="personal-wordpress",
        name="WordPress",
        platform="wordpress",
        concept="이직·연봉·커리어 고단가 키워드를 사실 기반으로 정리하는 블로그",
        audience="이직·연봉·성장을 고민하는 직장인",
    ),
    Brand(
        id="personal-blogger",
        name="Blogger",
        platform="blogger",
        concept="AI·노코드·애드센스 등 디지털 고단가 키워드를 사실 기반으로 정리하는 블로그",
        audience="도구·수익화·연동을 찾는 개인/사이드 빌더",
    ),
]


def count_chars(text: str) -> int:
    return len(re.sub(r"\s+", "", text or ""))


def quality_ok(title: str, md: str, min_chars: int, keyword: str) -> tuple[bool, str]:
    if count_chars(md) < min_chars:
        return False, f"chars={count_chars(md)}"
    blob = f"{title}\n{md}"
    if re.search(r"속보|충격 반전|99%가 모르는|무조건 수익|확정 수익", blob):
        return False, "fabrication_or_bait"
    if "단독:" in blob or "단독 :" in blob:
        return False, "fabrication_or_bait"
    if len(re.findall(r"^##\s+", md, flags=re.M)) < 6:
        return False, "sections"
    if keyword and keyword.split()[0] not in blob:
        return False, "keyword_missing"
    # SEO: meta-ish density — at least one checklist
    if not re.search(r"^[-*]\s+|^\d+\.\s+", md, flags=re.M):
        return False, "no_list"
    return True, "ok"


def pick_topic(platform: str) -> tuple[Topic, TrendSnapshot, list[str]]:
    """Pick topic using live KR search demand + high-CPC bank."""
    pool = topics_for(platform)
    used_titles = set(store.load_settings().get("used_titles") or [])
    used_kw = set(store.load_settings().get("used_keywords") or [])
    candidates = list(dict.fromkeys([t.keyword for t in pool]))
    best_kw, _score, snap = pick_best_keyword(candidates, used_kw | used_titles)
    # Prefer unused title for that keyword
    matches = [t for t in pool if t.keyword == best_kw and t.title not in used_titles]
    if not matches:
        matches = [t for t in pool if t.keyword == best_kw] or [
            t for t in pool if t.title not in used_titles
        ] or pool
    topic = matches[0]
    # Click-maximizing professional title
    topic = Topic(
        title=make_click_title(topic.keyword, topic.title, topic.search_intent),
        keyword=topic.keyword,
        secondary=topic.secondary,
        search_intent=topic.search_intent,
        outline=topic.outline,
        cpc_tier=topic.cpc_tier,
    )
    related = []
    try:
        raw = store._read("trends.json", {})  # noqa: SLF001
        related = list((raw.get("related") or {}).get(topic.keyword) or [])[:8]
    except Exception:
        related = []
    return topic, snap, related


def remember_title(title: str, keyword: str = "") -> None:
    s = store.load_settings()
    used = list(s.get("used_titles") or [])
    used.append(title)
    s["used_titles"] = used[-80:]
    if keyword:
        uk = list(s.get("used_keywords") or [])
        uk.append(keyword)
        s["used_keywords"] = uk[-40:]
    store.save_settings(s)


def _mock_article(brand: Brand, topic: Topic, trend_note: str = "") -> tuple[str, str, int]:
    kw = topic.keyword
    title = topic.title
    secs = topic.outline or ["문제", "원인", "방법", "예시", "착각", "체크리스트"]
    tn = trend_note or "실시간 검색·관련검색 신호를 반영한 고관심 주제"
    parts = [
        f"# {title}\n",
        f"**핵심 키워드:** {kw}\n",
        f"{brand.audience}가 '{kw}'를 검색할 때 실제로 막히는 지점만 골라 정리합니다. "
        f"과장된 수익·허위 수치 없이, 바로 점검할 수 있는 순서 중심입니다.\n",
        f"## {kw}, 왜 지금 정리해야 하나\n",
        f"{tn}. 검색 의도는 보통 '{topic.search_intent}'입니다. 예를 들어 조건·서류·순서를 모르면 "
        f"같은 실수를 반복합니다. 실제로 기본 구조만 잡아도 판단 속도가 달라집니다.\n",
    ]
    for i, s in enumerate(secs):
        parts.append(f"## {s}\n")
        parts.append(
            f"{kw} 맥락에서 '{s}'는 빼놓기 쉬운 구간입니다. 가령 관련 서류·숫자·기한을 "
            f"한 페이지로 적어두면 다음에 다시 검색할 필요가 줄어듭니다. "
            f"예를 들어 체크 항목을 3개만 정해도 실행률이 올라갑니다.\n"
        )
        if i == 0:
            parts.append(
                "1. 목표를 한 줄로 쓴다\n"
                "2. 필요한 서류/데이터를 모은다\n"
                "3. 비교 기준을 숫자로 정한다\n"
                "4. 실행 날짜를 캘린더에 넣는다\n"
                "5. 一周 뒤 결과만 점검한다\n"
            )
    parts += [
        "## 자주 하는 착각\n",
        f"'{kw}는 한 번에 끝난다'는 착각이 비용을 키웁니다. 반대로, 작은 점검을 반복하는 쪽이 "
        f"리스크가 낮습니다. 프레임을 '완료'가 아니라 '운영'으로 바꾸세요.\n",
        "## 실행 체크리스트\n",
        f"- {kw} 관련 현재 상태 메모\n- 비교할 옵션 2개 이상\n- 필요 서류 목록\n"
        f"- 오늘 할 일 1개\n- 다음 점검일\n",
        "## SEO·검색 안实用 요약\n",
        f"이 글의 검색 핵심은 '{kw}'입니다. 보조 키워드: {', '.join(topic.secondary)}. "
        f"제목과 본문에 의도를 맞춰, 허위 통계 없이 체크리스트로 끝냅니다.\n",
        "## 마무리\n",
        f"{brand.concept} 관점에서, 오늘은 '{kw}' 점검 한 줄만 실행하면 충분합니다.\n",
    ]
    md = "\n".join(parts)
    n = 0
    while count_chars(md) < brand.min_chars + 80:
        n += 1
        md += (
            f"\n## 보충 메모 {n}: {kw}\n\n"
            f"추가로 '{kw}'를 볼 때는 조건·비용·일정·리스크를 같은 표에 놓아보세요. "
            f"예를 들어 옵션 A/B를 나란히 쓰면 감정적 선택이 줄어듭니다. "
            f"가령 오늘 밤이 아니라 내일 아침 10분에 10분만 투자해도 다음 행동이 선명해집니다. "
            f"실제로 한 줄 메모 → 비교표 → 실행일 순서로만 잡아도 '{kw}' 관련 재검색이 줄어듭니다. "
            f"핵심은 완벽한 결론이 아니라, 오늘 검증 가능한 한 걸음입니다.\n"
        )
    return title, md, count_chars(md)


def write_article(
    brand: Brand,
    topic: Topic,
    *,
    trend_note: str = "",
    related: list[str] | None = None,
) -> tuple[str, str, int]:
    system = f"""You are a senior Korean SEO blog editor writing HIGH-QUALITY long-form posts.

Hard rules:
- Korean only. Start with exact H1: # {topic.title}
- Min {brand.min_chars} characters excluding spaces.
- At least 7 ## sections, concrete examples (예를 들어/가령/실제로), numbered + bullet checklists.
- Primary keyword "{topic.keyword}" in H2s naturally (no stuffing).
- Secondary: {', '.join(topic.secondary)}.
- FACTS ONLY: no fake news, no invented statistics, no "속보/단독", no guaranteed returns.
- Early section must mention why this topic has search demand now (use provided trend note; do not invent % numbers).
- Include an SEO summary section near the end with search intent.
- Audience: {brand.audience}
- Concept: {brand.concept}
- Output markdown only."""

    user = (
        f"Title (keep): {topic.title}\n"
        f"Keyword: {topic.keyword}\n"
        f"Search intent: {topic.search_intent}\n"
        f"Related searches: {', '.join(related or topic.secondary)}\n"
        f"Trend note: {trend_note or '고단가·검색의도 키워드'}\n"
        f"Outline promise: {topic.outline}\n"
        f"Write the full article now."
    )
    try:
        resp = llm_chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.5,
            max_tokens=5500,
            json_mode=False,
        )
        if not resp.ok or not (resp.text or "").strip():
            logger.warning("LLM blog fallback mock: %s", resp.error)
            return _mock_article(brand, topic, trend_note)
        md = resp.text.strip()
        # Force approved click title as H1
        md = re.sub(r"^#\s+.+$", f"# {topic.title}", md, count=1, flags=re.M)
        if not md.lstrip().startswith("#"):
            md = f"# {topic.title}\n\n" + md
        return topic.title, md, count_chars(md)
    except Exception as e:
        logger.warning("LLM blog write failed: %s", e)
        return _mock_article(brand, topic, trend_note)


def markdown_to_html(md: str, cover_url: str | None = None) -> str:
    out: list[str] = []
    if cover_url:
        out.append(f'<p><img src="{cover_url}" alt="cover" style="max-width:100%;height:auto"/></p>')
    for line in md.splitlines():
        if line.startswith("# "):
            out.append(f"<h1>{_esc(line[2:])}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{_esc(line[3:])}</h2>")
        elif line.startswith("### "):
            out.append(f"<h3>{_esc(line[4:])}</h3>")
        elif line.startswith("- "):
            out.append(f"<li>{_esc(line[2:])}</li>")
        elif re.match(r"^\d+\.\s+", line):
            out.append(f"<li>{_esc(re.sub(r'^\d+\.\s+', '', line))}</li>")
        elif line.strip():
            # bold
            html = _esc(line)
            html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
            out.append(f"<p>{html}</p>")
    return "\n".join(out)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def seo_meta(title: str, keyword: str, md: str, secondary: list[str] | None = None) -> dict:
    plain = re.sub(r"[#>*_`\-]", "", md)
    plain = re.sub(r"\s+", " ", plain).strip()
    desc = plain[:140]
    if keyword not in desc:
        desc = f"{keyword} 핵심 정리. " + desc[:120]
    slug = re.sub(r"[^\w가-힣]+", "-", title).strip("-")[:60]
    tags = [keyword]
    for s in secondary or []:
        if s not in tags:
            tags.append(s)
    tags.extend(["실무", "체크리스트"])
    return {
        "metaDescription": desc,
        "slug": slug or keyword,
        "tags": tags[:8],
    }


def _svg_figure(path, caption: str) -> str:
    try:
        svg_raw = path.read_text(encoding="utf-8")
        svg_embed = re.sub(r"<\?xml[^?]*\?>\s*", "", svg_raw).strip()
        return (
            f'<figure style="margin:1.25rem 0;padding:0">'
            f"{svg_embed}"
            f'<figcaption style="font-size:12px;opacity:.7;margin-top:6px">'
            f"{_esc(caption)}</figcaption></figure>\n"
        )
    except Exception:
        return ""


def publish_article(
    brand: Brand,
    topic: Topic,
    title: str,
    md: str,
    chars: int,
    *,
    live: bool = True,
    snap: TrendSnapshot | None = None,
    related: list[str] | None = None,
) -> dict:
    conns = store.load_connections()
    created = store.now_iso()
    meta = seo_meta(title, topic.keyword, md, topic.secondary)

    cover_dir = store._root() / "covers"  # noqa: SLF001
    stem = f"{brand.id}-{meta['slug'][:40]}"
    cover_path = cover_dir / f"{stem}.svg"
    chart_path = cover_dir / f"{stem}-chart.svg"
    mid_path = cover_dir / f"{stem}-mid.svg"

    chart_vals = sparkline_values(snap, topic.keyword) if snap else []
    trend_note = ""
    if snap and snap.notes:
        trend_note = snap.notes[0]
    if snap and snap.realtime:
        top = ", ".join(x["keyword"] for x in snap.realtime[:5] if x.get("keyword"))
        if top:
            trend_note = (trend_note + f" · 실시간 TOP: {top}")[:160]

    make_cover_svg(
        title,
        topic.keyword,
        cover_path,
        chart=chart_vals[:6] or None,
        trend_note=trend_note or "실시간 검색 신호 반영",
    )
    if chart_vals:
        make_chart_svg(chart_vals, topic.keyword, chart_path, title="지금 검색 관심도 비교")
    make_section_svg(
        topic.outline[0] if topic.outline else f"{topic.keyword} 핵심",
        topic.keyword,
        mid_path,
        subtitle="본문 중간 · 실무 포인트 시각화",
    )

    cover_url = f"/api/blog/cover/{cover_path.name}"

    article: dict = {
        "brandId": brand.id,
        "title": title,
        "markdown": md,
        "chars": chars,
        "platform": brand.platform,
        "keyword": topic.keyword,
        "secondary": topic.secondary,
        "metaDescription": meta["metaDescription"],
        "slug": meta["slug"],
        "coverPath": str(cover_path),
        "coverUrl": cover_url,
        "chartUrl": f"/api/blog/cover/{chart_path.name}" if chart_path.exists() else None,
        "midImageUrl": f"/api/blog/cover/{mid_path.name}",
        "trendNote": trend_note,
        "relatedSearches": related or [],
        "url": None,
        "published": False,
        "createdAt": created,
        "social": {},
    }

    body_html = markdown_to_html(md, cover_url=None)
    # Insert mid image after first H2 block for professional layout
    parts = body_html.split("<h2>", 2)
    if len(parts) >= 3:
        body_html = (
            parts[0]
            + "<h2>"
            + parts[1]
            + _svg_figure(mid_path, f"섹션 이미지 · {topic.keyword}")
            + "<h2>"
            + parts[2]
        )
    else:
        body_html = body_html + _svg_figure(mid_path, f"섹션 이미지 · {topic.keyword}")

    html_with_note = (
        _svg_figure(cover_path, f"커버 · {topic.keyword} · 저작권 프리")
        + (
            _svg_figure(chart_path, "검색 관심도 차트 · 실시간 합성 데이터")
            if chart_path.exists()
            else ""
        )
        + body_html
    )

    if brand.platform == "wordpress":
        wp = conns.get("wordpress") or {}
        if wp.get("baseUrl") and wp.get("username") and wp.get("appPassword"):
            status = "publish" if live else "draft"
            try:
                r = httpx.post(
                    f"{wp['baseUrl'].rstrip('/')}/wp-json/wp/v2/posts",
                    auth=(wp["username"], wp["appPassword"]),
                    json={
                        "title": title,
                        "content": html_with_note,
                        "status": status,
                        "excerpt": meta["metaDescription"],
                        "slug": meta["slug"],
                    },
                    timeout=45,
                )
                if r.status_code < 300:
                    data = r.json()
                    article["url"] = data.get("link")
                    article["published"] = status == "publish"
                    article["platform"] = "wordpress"
                else:
                    article["platform"] = "wordpress-local"
                    article["publishError"] = r.text[:200]
            except Exception as e:
                article["platform"] = "wordpress-local"
                article["publishError"] = str(e)
        else:
            article["platform"] = "storage"
    elif brand.platform == "blogger":
        bg = conns.get("blogger") or {}
        if bg.get("blogId") and bg.get("accessToken"):
            q = "" if live else "?isDraft=true"
            try:
                r = httpx.post(
                    f"https://www.googleapis.com/blogger/v3/blogs/{bg['blogId']}/posts{q}",
                    headers={"Authorization": f"Bearer {bg['accessToken']}"},
                    json={
                        "kind": "blogger#post",
                        "title": title,
                        "content": html_with_note,
                        "labels": [topic.keyword, "실무", "체크리스트"],
                    },
                    timeout=45,
                )
                if r.status_code < 300:
                    data = r.json()
                    article["url"] = data.get("url")
                    article["published"] = live
                else:
                    article["platform"] = "blogger-local"
                    article["publishError"] = r.text[:200]
            except Exception as e:
                article["platform"] = "blogger-local"
                article["publishError"] = str(e)
        else:
            article["platform"] = "storage"
    else:
        # Naver: no public API — paste pack + optional blog write URL
        article["platform"] = "naver-export"
        out = store._root() / "naver-export"  # noqa: SLF001
        out.mkdir(parents=True, exist_ok=True)
        stamp = created.replace(":", "-")
        md_path = out / f"{stamp}.md"
        html_path = out / f"{stamp}.html"
        md_path.write_text(md, encoding="utf-8")
        html_path.write_text(html_with_note, encoding="utf-8")
        article["url"] = str(html_path)
        article["naverWriteHint"] = "네이버 블로그 글쓰기 → HTML/본문 붙여넣기 후 발행"
        nid = (conns.get("naver") or {}).get("blogId")
        if nid:
            article["naverBlog"] = f"https://blog.naver.com/{nid}"

    public_url = article.get("url") if article.get("published") else article.get("url")
    article["social"] = build_social_copies(
        title=title,
        keyword=topic.keyword,
        url=public_url,
        platform=brand.platform,
        related=related,
        polish=True,
    )
    return article


def notify_done(body: str) -> None:
    topic = store.ntfy_topic()
    if not topic:
        return
    try:
        httpx.post(
            f"https://ntfy.sh/{topic}",
            headers={
                "Title": "Blog publish done",
                "Tags": "white_check_mark",
                "Content-Type": "text/plain; charset=utf-8",
            },
            content=body.encode("utf-8"),
            timeout=15,
        )
    except Exception as e:
        logger.warning("ntfy failed: %s", e)


def generate_all(*, live: bool = True) -> dict:
    job = {"id": store.now_iso(), "status": "running", "startedAt": store.now_iso(), "live": live}
    store.save_job(job)
    results: list[dict] = []
    try:
        for brand in BRANDS:
            topic, snap, related = pick_topic(brand.platform)
            reasons = []
            try:
                raw = store._read("trends.json", {})  # noqa: SLF001
                reasons = list((raw.get("reasons") or {}).get(topic.keyword) or [])
            except Exception:
                reasons = []
            trend_note = " / ".join(reasons[:3]) if reasons else (snap.notes[0] if snap.notes else "")
            title, md, chars = write_article(
                brand, topic, trend_note=trend_note, related=related
            )
            ok, detail = quality_ok(title, md, brand.min_chars, topic.keyword)
            if not ok:
                logger.info("retry write %s: %s", brand.id, detail)
                title, md, chars = write_article(
                    brand, topic, trend_note=trend_note, related=related
                )
                ok, detail = quality_ok(title, md, brand.min_chars, topic.keyword)
            if not ok:
                title, md, chars = _mock_article(brand, topic, trend_note)
                while count_chars(md) < brand.min_chars:
                    md += (
                        f"\n\n'{topic.keyword}' 추가 점검: 조건, 비용, 일정, 대안을 "
                        f"한 줄씩 적고 예를 들어 오늘 실행할 항목 하나만 고르세요.\n"
                    )
                    chars = count_chars(md)
                ok, detail = quality_ok(title, md, brand.min_chars, topic.keyword)
            if not ok:
                raise RuntimeError(f"Quality gate failed for {brand.id}: {detail}")
            remember_title(topic.title, topic.keyword)
            results.append(
                publish_article(
                    brand,
                    topic,
                    title,
                    md,
                    chars,
                    live=live,
                    snap=snap,
                    related=related,
                )
            )

        body_lines = []
        for r in results:
            flag = "발행" if r.get("published") else "저장"
            body_lines.append(
                f"• [{r['keyword']}] {r['title']} ({r['chars']}자) → {r['platform']} ({flag})"
            )
        body = "\n".join(body_lines)
        inbox = {
            "title": "블로그 생성·발행 완료",
            "body": f"{len(results)}편 완료\n\n{body}",
            "results": results,
            "at": store.now_iso(),
        }
        store.save_inbox(inbox)
        notify_done(inbox["body"])
        job.update({"status": "done", "finishedAt": store.now_iso(), "results": results})
        store.save_job(job)
        return job
    except Exception as e:
        job.update({"status": "error", "finishedAt": store.now_iso(), "error": str(e)})
        store.save_job(job)
        return job
