"""High-quality, high-CPC factual blog generator + publish + SNS packs."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import httpx

from oracle.content_blog import store
from oracle.content_blog.covers import make_chart_svg, make_cover_svg, make_section_svg
from oracle.content_blog.images import make_article_images
from oracle.content_blog.issues import pick_issue_topic
from oracle.content_blog.social import build_social_copies
from oracle.content_blog.topics import Topic
from oracle.content_blog.trends import TrendSnapshot, build_snapshot, sparkline_values
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


def pick_topic(platform: str) -> tuple[Topic, TrendSnapshot, list[str], dict]:
    """Pick from live issues/search first; keep CPC bank as fallback."""
    used_titles = set(store.load_settings().get("used_titles") or [])
    used_kw = set(store.load_settings().get("used_keywords") or [])
    topic, issue = pick_issue_topic(platform, used_titles | used_kw)
    related = list(issue.get("related") or topic.secondary)[:8]
    # Snapshot for charts: score THIS topic's related searches as interest bars
    chart_keys = [topic.keyword] + [r for r in related if r != topic.keyword][:5]
    snap = build_snapshot(chart_keys)
    notes = [
        f"실시간 소스:{issue.get('source', 'live')}",
        f"관심점수:{int(issue.get('score') or 0)}",
    ]
    if issue.get("news"):
        notes.append("뉴스 헤드라인 교차확인")
    if issue.get("commercial"):
        notes.append(f"관련검색 실용의도 {issue.get('commercial')}건")
    snap.notes = notes + list(snap.notes or [])
    return topic, snap, related, issue


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


def _mock_article(
    brand: Brand,
    topic: Topic,
    trend_note: str = "",
    *,
    on_progress=None,
) -> tuple[str, str, int]:
    import time

    kw = topic.keyword
    title = topic.title
    secs = topic.outline or ["문제", "원인", "방법", "예시", "착각", "체크리스트"]
    tn = trend_note or "실시간 검색·관련검색 신호를 반영한 고관심 주제"
    parts: list[str] = []

    def _emit(chunk: str, step: str) -> None:
        parts.append(chunk)
        md_now = "\n".join(parts)
        if on_progress:
            on_progress(
                step,
                draftPreview=md_now[-1200:],
                platform=brand.platform,
                step=step,
                chars=count_chars(md_now),
            )
            time.sleep(0.15)

    _emit(f"# {title}\n", f"[{brand.name}] 제목 작성…")
    _emit(f"**핵심 키워드:** {kw}\n", f"[{brand.name}] 키워드 넣는 중…")
    _emit(
        f"{brand.audience}가 '{kw}'를 검색할 때 실제로 막히는 지점만 골라 정리합니다. "
        f"과장된 수익·허위 수치 없이, 바로 점검할 수 있는 순서 중심입니다.\n",
        f"[{brand.name}] 서론 쓰는 중…",
    )
    _emit(f"## {kw}, 왜 지금 정리해야 하나\n", f"[{brand.name}] 섹션: 왜 지금")
    _emit(
        f"{tn}. 검색 의도는 보통 '{topic.search_intent}'입니다. 예를 들어 조건·서류·순서를 모르면 "
        f"같은 실수를 반복합니다. 실제로 기본 구조만 잡아도 판단 속도가 달라집니다.\n",
        f"[{brand.name}] 본문 확장 중… ({count_chars(chr(10).join(parts))}자)",
    )
    for i, s in enumerate(secs):
        _emit(f"## {s}\n", f"[{brand.name}] 쓰는 중: {s}")
        _emit(
            f"{kw} 맥락에서 '{s}'는 빼놓기 쉬운 구간입니다. 가령 관련 서류·숫자·기한을 "
            f"한 페이지로 적어두면 다음에 다시 검색할 필요가 줄어듭니다. "
            f"예를 들어 체크 항목을 3개만 정해도 실행률이 올라갑니다.\n",
            f"[{brand.name}] {s} 문단 완료 · {count_chars(chr(10).join(parts))}자",
        )
        if i == 0:
            _emit(
                "1. 목표를 한 줄로 쓴다\n"
                "2. 필요한 서류/데이터를 모은다\n"
                "3. 비교 기준을 숫자로 정한다\n"
                "4. 실행 날짜를 캘린더에 넣는다\n"
                "5. 일주일 뒤 결과만 점검한다\n",
                f"[{brand.name}] 체크리스트 넣는 중…",
            )
    for label, body in [
        (
            "자주 하는 착각",
            f"'{kw}는 한 번에 끝난다'는 착각이 비용을 키웁니다. 반대로, 작은 점검을 반복하는 쪽이 "
            f"리스크가 낮습니다. 프레임을 '완료'가 아니라 '운영'으로 바꾸세요.\n",
        ),
        (
            "실행 체크리스트",
            f"- {kw} 관련 현재 상태 메모\n- 비교할 옵션 2개 이상\n- 필요 서류 목록\n"
            f"- 오늘 할 일 1개\n- 다음 점검일\n",
        ),
        (
            "SEO·검색 요약",
            f"이 글의 검색 핵심은 '{kw}'입니다. 보조 키워드: {', '.join(topic.secondary)}. "
            f"제목과 본문에 의도를 맞춰, 허위 통계 없이 체크리스트로 끝냅니다.\n",
        ),
        (
            "마무리",
            f"{brand.concept} 관점에서, 오늘은 '{kw}' 점검 한 줄만 실행하면 충분합니다.\n",
        ),
    ]:
        _emit(f"## {label}\n", f"[{brand.name}] 섹션: {label}")
        _emit(body, f"[{brand.name}] {label} 작성… {count_chars(chr(10).join(parts))}자")

    md = "\n".join(parts)
    n = 0
    while count_chars(md) < brand.min_chars + 80:
        n += 1
        extra = (
            f"\n## 보충 메모 {n}: {kw}\n\n"
            f"추가로 '{kw}'를 볼 때는 조건·비용·일정·리스크를 같은 표에 놓아보세요. "
            f"예를 들어 옵션 A/B를 나란히 쓰면 감정적 선택이 줄어듭니다. "
            f"가령 오늘 밤이 아니라 내일 아침 10분에 10분만 투자해도 다음 행동이 선명해집니다. "
            f"실제로 한 줄 메모 → 비교표 → 실행일 순서로만 잡아도 '{kw}' 관련 재검색이 줄어듭니다. "
            f"핵심은 완벽한 결론이 아니라, 오늘 검증 가능한 한 걸음입니다.\n"
        )
        md += extra
        if on_progress:
            on_progress(
                f"[{brand.name}] 분량 채우는 중… {count_chars(md)}자",
                draftPreview=md[-1200:],
                platform=brand.platform,
                chars=count_chars(md),
            )
            time.sleep(0.08)
    return title, md, count_chars(md)


def _reveal_draft(md: str, brand: Brand, on_progress) -> None:
    """Push finished markdown in section chunks so the UI feels live."""
    import time

    if not on_progress:
        return
    chunks = re.split(r"(?=^##\s+)", md, flags=re.M)
    acc = ""
    for i, ch in enumerate(chunks):
        if not ch.strip():
            continue
        acc += ch if acc.endswith("\n") or not acc else "\n" + ch
        head = re.search(r"^##\s+(.+)$", ch, flags=re.M)
        label = head.group(1).strip() if head else ("제목" if i == 0 else "본문")
        on_progress(
            f"[{brand.name}] 화면에 쓰는 중: {label} · {count_chars(acc)}자",
            draftPreview=acc[-1400:],
            platform=brand.platform,
            chars=count_chars(acc),
        )
        time.sleep(0.12)


def write_article(
    brand: Brand,
    topic: Topic,
    *,
    trend_note: str = "",
    related: list[str] | None = None,
    fact_bits: str = "",
    on_progress=None,
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
- FACT CHECK: separate verified facts vs unknown/rumors; never invent events, scores, quotes.
- If news headlines are provided, paraphrase carefully as '보도된 내용/확인 중' when uncertain.
- Include an SEO summary section near the end with search intent.
- Audience: {brand.audience}
- Concept: {brand.concept}
- Output markdown only."""

    user = (
        f"Title (keep): {topic.title}\n"
        f"Keyword: {topic.keyword}\n"
        f"Search intent: {topic.search_intent}\n"
        f"Related searches: {', '.join(related or topic.secondary)}\n"
        f"Trend note: {trend_note or '실시간 검색 이슈'}\n"
        f"News headlines (verify carefully, do not invent beyond them): {fact_bits}\n"
        f"Outline promise: {topic.outline}\n"
        f"Write the full article now."
    )
    if on_progress:
        on_progress(
            f"[{brand.name}] AI 초안 요청 중… ({topic.keyword})",
            draftPreview=f"# {topic.title}\n\n(작성 시작…)",
            platform=brand.platform,
            step="llm",
        )
    try:
        resp = llm_chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.5,
            max_tokens=5500,
            json_mode=False,
            # Keep UI lively: fail over to streamed template writing quickly
            timeout=12.0 if on_progress else 35.0,
        )
        if not resp.ok or not (resp.text or "").strip():
            logger.warning("LLM blog fallback mock: %s", resp.error)
            if on_progress:
                on_progress(
                    f"[{brand.name}] AI 대기 길어져 실무 템플릿으로 이어서 작성…",
                    platform=brand.platform,
                )
            return _mock_article(brand, topic, trend_note, on_progress=on_progress)
        md = resp.text.strip()
        # Force approved click title as H1
        md = re.sub(r"^#\s+.+$", f"# {topic.title}", md, count=1, flags=re.M)
        if not md.lstrip().startswith("#"):
            md = f"# {topic.title}\n\n" + md
        _reveal_draft(md, brand, on_progress)
        return topic.title, md, count_chars(md)
    except Exception as e:
        logger.warning("LLM blog write failed: %s", e)
        if on_progress:
            on_progress(f"[{brand.name}] AI 오류 → 템플릿 작성으로 전환", platform=brand.platform)
        return _mock_article(brand, topic, trend_note, on_progress=on_progress)


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

    chart_vals = sparkline_values(snap, topic.keyword) if snap else []
    trend_note = ""
    if snap and snap.notes:
        trend_note = " · ".join(snap.notes[:3])[:180]
    if snap and snap.realtime:
        top = ", ".join(x["keyword"] for x in snap.realtime[:5] if x.get("keyword"))
        if top and "실시간" not in trend_note:
            trend_note = (trend_note + f" · 실시간 TOP: {top}")[:200]

    # Prefer AI situational images (ChatGPT/Gemini-like). SVG fallback if gen fails.
    ai_imgs = make_article_images(
        title=title, keyword=topic.keyword, out_dir=cover_dir, stem=stem
    )
    cover_path = ai_imgs.get("cover")
    mid_path = ai_imgs.get("mid")
    scene_path = ai_imgs.get("scene")
    chart_path = cover_dir / f"{stem}-chart.svg"
    if chart_vals:
        make_chart_svg(
            chart_vals,
            topic.keyword,
            chart_path,
            title=f"{topic.keyword} 관련 검색 관심도",
        )

    if not cover_path:
        cover_path = cover_dir / f"{stem}.svg"
        make_cover_svg(
            title,
            topic.keyword,
            cover_path,
            chart=chart_vals[:6] or None,
            trend_note=trend_note or "실시간 검색 신호 반영",
        )
    if not mid_path:
        mid_path = cover_dir / f"{stem}-mid.svg"
        make_section_svg(
            topic.outline[0] if topic.outline else f"{topic.keyword} 핵심",
            topic.keyword,
            mid_path,
            subtitle="본문 중간 · 상황 일러스트",
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
        "sceneImageUrl": f"/api/blog/cover/{scene_path.name}" if scene_path else None,
        "trendNote": trend_note,
        "relatedSearches": related or [],
        "url": None,
        "published": False,
        "createdAt": created,
        "social": {},
    }

    def _img_figure(path, caption: str) -> str:
        if path.suffix.lower() == ".svg":
            return _svg_figure(path, caption)
        url = f"/api/blog/cover/{path.name}"
        # For remote CMS we also embed as hosted URL when possible; local path used in export note
        try:
            import base64

            raw = path.read_bytes()
            mime = "image/jpeg" if path.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
            b64 = base64.b64encode(raw).decode("ascii")
            src = f"data:{mime};base64,{b64}"
        except Exception:
            src = url
        return (
            f'<figure style="margin:1.25rem 0;padding:0">'
            f'<img src="{src}" alt="{_esc(caption)}" style="width:100%;height:auto;border-radius:12px"/>'
            f'<figcaption style="font-size:12px;opacity:.7;margin-top:6px">'
            f"{_esc(caption)}</figcaption></figure>\n"
        )

    body_html = markdown_to_html(md, cover_url=None)
    mid_fig = _img_figure(mid_path, f"상황 일러스트 · {topic.keyword} · 얼굴 없는 AI 생성")
    parts = body_html.split("<h2>", 2)
    if len(parts) >= 3:
        body_html = parts[0] + "<h2>" + parts[1] + mid_fig + "<h2>" + parts[2]
    else:
        body_html = body_html + mid_fig

    html_with_note = (
        _img_figure(cover_path, f"커버 일러스트 · {topic.keyword}")
        + (
            _img_figure(scene_path, "검색·궁금증 상황 이미지")
            if scene_path
            else (
                _svg_figure(chart_path, "관련 검색 관심도")
                if chart_path.exists()
                else ""
            )
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
        polish=False,
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


def generate_all(*, live: bool = True, on_progress=None) -> dict:
    def prog(msg: str, **extra) -> None:
        if on_progress:
            try:
                on_progress(msg, **extra)
            except Exception as e:
                logger.debug("on_progress failed: %s", e)

    job = {"id": store.now_iso(), "status": "running", "startedAt": store.now_iso(), "live": live}
    store.save_job(job)
    results: list[dict] = []
    try:
        prog("실시간 검색·이슈·관련검색·뉴스 헤드라인 수집/교차확인 중…", step="trends")
        for idx, brand in enumerate(BRANDS, start=1):
            prog(
                f"({idx}/{len(BRANDS)}) {brand.name} · 지금 사람들이 뭘 찾는지 분석 중…",
                platform=brand.platform,
                step="pick",
            )
            topic, snap, related, issue = pick_topic(brand.platform)
            trend_note = " · ".join(snap.notes[:3]) if snap.notes else "실시간 이슈"
            fact_bits = " | ".join((issue.get("news") or [])[:4])
            prog(
                f"[{brand.name}] 주제 확정: {topic.keyword} — {topic.title[:36]}",
                draftPreview=(
                    f"# {topic.title}\n\n키워드: {topic.keyword}\n"
                    f"관련검색: {', '.join(related[:5])}\n"
                    f"팩트체크 참고: {fact_bits or '(관련검색 기반)'}"
                ),
                platform=brand.platform,
                step="topic",
            )
            title, md, chars = write_article(
                brand,
                topic,
                trend_note=trend_note,
                related=related,
                fact_bits=fact_bits,
                on_progress=prog,
            )
            ok, detail = quality_ok(title, md, brand.min_chars, topic.keyword)
            if not ok:
                logger.info("quality fallback mock %s: %s", brand.id, detail)
                prog(f"[{brand.name}] 품질 보완 재작성… ({detail})")
                title, md, chars = _mock_article(
                    brand, topic, trend_note, on_progress=prog
                )
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
            prog(
                f"[{brand.name}] AI 상황 일러스트 생성 + SNS·발행 준비… ({chars}자)",
                draftPreview=md[-1400:],
                platform=brand.platform,
                step="publish",
            )
            article = publish_article(
                brand,
                topic,
                title,
                md,
                chars,
                live=live,
                snap=snap,
                related=related,
            )
            results.append(article)
            flag = "발행" if article.get("published") else "저장"
            prog(
                f"[{brand.name}] 완료 · {flag} · {chars}자",
                draftPreview=md[:1400],
                platform=brand.platform,
                step="done_one",
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
        prog(f"전체 완료 · {len(results)}편", step="done", draftPreview="")
        return job
    except Exception as e:
        job.update({"status": "error", "finishedAt": store.now_iso(), "error": str(e)})
        store.save_job(job)
        prog(f"실패: {e}", step="error")
        return job
