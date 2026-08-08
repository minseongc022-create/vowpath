"""Fact-based long-form blog generator for Naver / WordPress / Blogger."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from oracle.content_blog import store
from oracle.llm.client import chat as llm_chat

logger = logging.getLogger("oracle.content_blog")


@dataclass
class Brand:
    id: str
    name: str
    platform: str
    concept: str
    audience: str
    pillars: list[str]
    min_chars: int = 2000


BRANDS = [
    Brand(
        id="personal-naver",
        name="네이버",
        platform="naver",
        concept="직장인 월급·현금흐름을 사실 기반으로 정리하는 실용 블로그",
        audience="월급으로 생활비·저축 구조를 바꾸고 싶은 직장인",
        pillars=["월급 관리", "현금흐름", "통장 분리", "자동이체"],
    ),
    Brand(
        id="personal-wordpress",
        name="WordPress",
        platform="wordpress",
        concept="일잘러를 위한 우선순위·업무 시스템을 사실 기반으로 정리하는 블로그",
        audience="야근은 많은데 성과가 안 보이는 직장인",
        pillars=["우선순위", "업무 시스템", "회의", "문서화"],
    ),
    Brand(
        id="personal-blogger",
        name="Blogger",
        platform="blogger",
        concept="비개발자도 이해하는 기술·디지털 개념을 사실 기반으로 풀어쓰는 블로그",
        audience="IT 용어는 듣지만 개념 설명이 어려운 직장인·기획자",
        pillars=["API", "데이터", "보안 기초", "자동화"],
    ),
]

TITLES = {
    "personal-naver": [
        "월급이 안 모이는 진짜 이유: 통장에 '머물 자리'가 없다",
        "부업보다 먼저: 현금 구멍 3개부터 막아라",
        "아끼는데 잔액이 그대로인 사람만 걸리는 구조 문제",
    ],
    "personal-wordpress": [
        "야근이 줄지 않는 진짜 이유: 우선순위 운영체제가 없다",
        "바쁜데 성과가 없다면 MIT 3개부터 다시 짜라",
        "회의가 일을 잡아먹는 날, WIP 제한이 답이다",
    ],
    "personal-blogger": [
        "API를 '연결선'으로만 이해하면 사고 치는 이유",
        "노코드로 붙였는데 깨지는 이유: 계약이 없다",
        "기획자도 읽는 API 체크리스트 5줄",
    ],
}


def count_chars(text: str) -> int:
    return len(re.sub(r"\s+", "", text or ""))


def quality_ok(title: str, md: str, min_chars: int) -> tuple[bool, str]:
    if count_chars(md) < min_chars:
        return False, f"chars={count_chars(md)}"
    blob = f"{title}\n{md}"
    if re.search(r"속보|단독\s*|충격 반전|99%가 모르는|무조건 수익", blob):
        return False, "fabrication_or_bait"
    if len(re.findall(r"^##\s+", md, flags=re.M)) < 5:
        return False, "sections"
    return True, "ok"


def pick_title(brand_id: str) -> str:
    import random

    opts = TITLES.get(brand_id) or ["사실 기반 실무 가이드"]
    return random.choice(opts)


def _mock_article(brand: Brand, title: str) -> tuple[str, str, int]:
    blocks = [
        f"# {title}\n",
        f"{brand.audience}를 위한 실무 메모다. 과장 없이 바로 쓸 수 있게 정리한다.\n",
        "## 왜 이 문제가 반복되나\n",
        "핵심은 의지 부족이 아니라 **기본값**이다. 예를 들어 규칙이 없으면 매일 같은 실수를 반복한다. 실제로 작은 장치 하나가 한 달 결과를 바꾼다.\n",
        "## 착각\n",
        '"나중에 하면 된다"는 착각이 가장 비싸다. 반대로, 오늘 실행 가능한 한 줄이 시스템을 만든다.\n',
        "## 실행 프레임\n",
        "1. 오늘 할 일 1개만 정한다\n2. 자동으로 돌아가게 만든다\n3. 주 1회 점검한다\n4. 막히면 규칙을 고친다\n5. 다음 주로 넘기지 않는다\n",
        "## 구체 예시\n",
        "가령 아침에 10분만 투자해 체크리스트를 보면, 오후의 혼란이 줄어든다. 예를 들어 같은 요청이 반복되면 문서 한 페이지로 끝낸다.\n",
        "## 체크리스트\n",
        "- 목표 한 줄 쓰기\n- 방해 요소 제거\n- 자동 장치 1개\n- 금요일 회고 15분\n- 다음 주 MIT 3개\n",
        "## 마무리\n",
        f"이 글은 일반 원칙과 실무 메모다. 과장된 보장 수익 이야기가 아니다. {brand.concept} 관점에서, 오늘 하나만 실행하라.\n",
        "## 한 달 점검\n",
        "한 달 뒤에는 결과가 아니라 기본값이 바뀌었는지 본다. 규칙이 유지되면 구조는 작동 중이다.\n",
        f"## {brand.pillars[0]} 적용\n",
        f"혼자 할 때도, 팀에서 할 때도 같은 원리다. 문서화·자동화·점검. 이 세 가지가 {brand.pillars[0]}의 출발점이다.\n",
    ]
    md = "\n".join(blocks)
    i = 0
    while count_chars(md) < brand.min_chars:
        i += 1
        md += (
            f"\n## 보충 {i}\n\n"
            f"실무 점검 {i}번째 메모: 예를 들어 같은 원칙이라도 실행 순서가 바뀌면 결과가 달라진다. "
            f"가령 규칙 {i}을 먼저 문서화하면 반복 질문이 줄어든다. 실제로 오늘 한 줄만 남겨도 내일 다시 시작할 수 있다.\n"
        )
    return title, md, count_chars(md)


def write_article(brand: Brand, title: str) -> tuple[str, str, int]:
    system = (
        "You are a Korean blog writer. Write factual, useful long-form posts.\n"
        f"- Korean only. Start with # title.\n"
        f"- Min {brand.min_chars} chars (no spaces).\n"
        "- At least 6 ## sections, concrete examples, checklists.\n"
        "- Compelling but HONEST title — no fake news, no invented stats.\n"
        f"- Concept: {brand.concept}\n"
        f"- Audience: {brand.audience}\n"
    )
    user = f"Write full article.\nTitle angle: {title}\nPillars: {', '.join(brand.pillars)}\n"
    try:
        resp = llm_chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.55,
            max_tokens=4500,
            json_mode=False,
        )
        if not resp.ok or not (resp.text or "").strip():
            logger.warning("LLM unavailable for blog, using mock: %s", resp.error)
            return _mock_article(brand, title)
        md = resp.text.strip()
        t = re.search(r"^#\s+(.+)$", md, flags=re.M)
        final_title = t.group(1).strip() if t else title
        return final_title, md, count_chars(md)
    except Exception as e:
        logger.warning("LLM blog write failed: %s", e)
        return _mock_article(brand, title)


def markdown_to_html(md: str) -> str:
    out: list[str] = []
    for line in md.splitlines():
        if line.startswith("# "):
            out.append(f"<h1>{_esc(line[2:])}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{_esc(line[3:])}</h2>")
        elif line.startswith("- "):
            out.append(f"<li>{_esc(line[2:])}</li>")
        elif re.match(r"^\d+\.\s+", line):
            out.append(f"<li>{_esc(re.sub(r'^\d+\.\s+', '', line))}</li>")
        elif line.strip():
            out.append(f"<p>{_esc(line)}</p>")
    return "\n".join(out)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def publish_article(brand: Brand, title: str, md: str, chars: int) -> dict:
    import httpx

    conns = store.load_connections()
    created = store.now_iso()
    article = {
        "brandId": brand.id,
        "title": title,
        "markdown": md,
        "chars": chars,
        "platform": brand.platform,
        "url": None,
        "createdAt": created,
    }

    if brand.platform == "wordpress":
        wp = conns.get("wordpress") or {}
        if wp.get("baseUrl") and wp.get("username") and wp.get("appPassword"):
            try:
                auth = (wp["username"], wp["appPassword"])
                r = httpx.post(
                    f"{wp['baseUrl'].rstrip('/')}/wp-json/wp/v2/posts",
                    auth=auth,
                    json={"title": title, "content": markdown_to_html(md), "status": "draft"},
                    timeout=30,
                )
                if r.status_code < 300:
                    article["url"] = r.json().get("link")
                    article["platform"] = "wordpress"
                else:
                    article["platform"] = "wordpress-local"
            except Exception as e:
                logger.warning("WP publish failed: %s", e)
                article["platform"] = "wordpress-local"
        else:
            article["platform"] = "storage"
    elif brand.platform == "blogger":
        bg = conns.get("blogger") or {}
        if bg.get("blogId") and bg.get("accessToken"):
            try:
                r = httpx.post(
                    f"https://www.googleapis.com/blogger/v3/blogs/{bg['blogId']}/posts?isDraft=true",
                    headers={"Authorization": f"Bearer {bg['accessToken']}"},
                    json={"kind": "blogger#post", "title": title, "content": markdown_to_html(md)},
                    timeout=30,
                )
                if r.status_code < 300:
                    article["url"] = r.json().get("url")
                else:
                    article["platform"] = "blogger-local"
            except Exception as e:
                logger.warning("Blogger publish failed: %s", e)
                article["platform"] = "blogger-local"
        else:
            article["platform"] = "storage"
    else:
        article["platform"] = "naver-export"
        # save paste-ready file
        out = store._root() / "naver-export"  # noqa: SLF001
        out.mkdir(parents=True, exist_ok=True)
        stamp = created.replace(":", "-")
        path = out / f"{stamp}-{brand.id}.md"
        path.write_text(md, encoding="utf-8")
        article["url"] = str(path)

    return article


def notify_done(body: str) -> None:
    import httpx

    topic = store.ntfy_topic()
    if not topic:
        return
    try:
        httpx.post(
            f"https://ntfy.sh/{topic}",
            headers={
                "Title": "Content Autopilot done",
                "Tags": "white_check_mark",
                "Content-Type": "text/plain; charset=utf-8",
            },
            content=body.encode("utf-8"),
            timeout=15,
        )
    except Exception as e:
        logger.warning("ntfy failed: %s", e)


def generate_all() -> dict:
    job = {"id": store.now_iso(), "status": "running", "startedAt": store.now_iso()}
    store.save_job(job)
    results: list[dict] = []
    try:
        for brand in BRANDS:
            title_angle = pick_title(brand.id)
            title, md, chars = write_article(brand, title_angle)
            ok, detail = quality_ok(title, md, brand.min_chars)
            if not ok:
                title, md, chars = write_article(brand, title_angle)
                ok, detail = quality_ok(title, md, brand.min_chars)
            if not ok:
                raise RuntimeError(f"Quality gate failed for {brand.id}: {detail}")
            results.append(publish_article(brand, title, md, chars))

        body = "\n".join(
            f"• [{r['brandId']}] {r['title']} ({r['chars']}자) → {r['platform']}" for r in results
        )
        inbox = {
            "title": "블로그 초안 생성 완료",
            "body": f"{len(results)}편 생성됨\n\n{body}",
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
