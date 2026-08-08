"""SNS traffic copy — Threads(친근·궁금증) / Instagram(세련·전문)."""

from __future__ import annotations

import random
import re

from oracle.llm.client import chat as llm_chat


# Patterns inspired by high-engagement KR info posts (curiosity → save → link)
THREADS_HOOKS = [
    "요즘 {kw} 뭔지 앎? ㅈㄴ 많이들 찾아보던데",
    "솔직히 {kw} 이거 모르고 그냥 진행한 사람… 손",
    "요즘 타임라인에 {kw} 왜 이렇게 뜨냐 싶어서 정리함",
    "{kw} 검색하다 멘탈 나가기 전에 이거만",
    "친구한테 {kw} 물어봤는데 대답이 전부 달랐음. 그래서 팩트만 모음",
]

IG_HOOKS = [
    "{kw}, 요즘 검색량이 눈에 띄게 움직입니다.",
    "한 번만 제대로 정리하면 반복 검색이 줄어드는 주제 — {kw}",
    "{title_short}",
]


def _clean_slang(text: str) -> str:
    # keep vibe but avoid banned fabrication bait
    text = re.sub(r"확정\s*수익|무조건\s*돈|속보|단독\s*:", "", text)
    return text.strip()


def _rule_threads(title: str, keyword: str, url: str, related: list[str] | None = None) -> str:
    hook = random.choice(THREADS_HOOKS).format(kw=keyword)
    rel = ""
    if related:
        top = [r for r in related if r != keyword][:3]
        if top:
            rel = "사람들이 같이 찾는 거: " + " / ".join(top) + "\n\n"
    body = (
        f"{hook}\n\n"
        f"핵심만 말하면 ↓\n"
        f"👉 {title}\n\n"
        f"{rel}"
        f"과장 수치 없이, 바로 체크할 순서만 적어둠.\n"
        f"저장해두고 필요할 때 다시 봐.\n\n"
        f"{url}\n\n"
        f"#{keyword.replace(' ', '')} #요즘이거 #정보글 #실무팁"
    )
    return _clean_slang(body)


def _rule_instagram(title: str, keyword: str, url: str, related: list[str] | None = None) -> str:
    short = title if len(title) < 42 else title[:40] + "…"
    hook = random.choice(IG_HOOKS).format(kw=keyword, title_short=short)
    rel_line = ""
    if related:
        top = [r for r in related if keyword.split()[0] in r or r != keyword][:4]
        if top:
            rel_line = "함께 찾는 검색어 · " + " · ".join(top) + "\n\n"
    body = (
        f"{hook}\n\n"
        f"{title}\n\n"
        f"{keyword}는 ‘느낌’이 아니라 조건·순서·서류가 결과를 가릅니다.\n"
        f"오늘은 실무에서 막히는 지점만 구조적으로 정리했습니다.\n\n"
        f"{rel_line}"
        f"전체 가이드는 프로필 링크 / Threads에 연결해 두었습니다.\n"
        f"{url}\n\n"
        f".\n.\n.\n"
        f"#{keyword.replace(' ', '')} #직장인정보 #실용가이드 #검색이슈 #체크리스트 #인사이트"
    )
    return _clean_slang(body)


def _llm_polish(platform: str, draft: str, title: str, keyword: str) -> str | None:
    if platform == "threads":
        sys = (
            "너는 한국 Threads에서 잘 퍼지는 정보 글 작가다. "
            "말투: 친한 친구에게 말하는 톤, 궁금증 유발, 짧게. "
            "'뭔지 앎?', '요즘 ㅈㄴ 뜨던데', '저장각' 같은 톤 OK. "
            "허위 속보/확정수익/단독 금지. 한국어만. 본문만 출력."
        )
    else:
        sys = (
            "너는 한국 Instagram 정보 계정 캡션 작가다. "
            "말투: 친근하지만 Threads보다 단정·전문적. 줄바꿈 가독성. "
            "허위 수치·확정수익 금지. 해시태그는 마지막. 한국어만. 본문만 출력."
        )
    try:
        resp = llm_chat(
            [
                {"role": "system", "content": sys},
                {
                    "role": "user",
                    "content": (
                        f"키워드:{keyword}\n제목:{title}\n초안:\n{draft}\n\n"
                        "인기 정보글 느낌을 살려 다듬어줘. 링크 줄은 유지."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=700,
            json_mode=False,
        )
        if resp.ok and (resp.text or "").strip():
            return _clean_slang(resp.text.strip())
    except Exception:
        return None
    return None


def build_social_copies(
    *,
    title: str,
    keyword: str,
    url: str | None,
    platform: str,
    related: list[str] | None = None,
    polish: bool = True,
) -> dict[str, str]:
    link = url or "(블로그 링크 붙여넣기)"
    threads = _rule_threads(title, keyword, link, related)
    instagram = _rule_instagram(title, keyword, link, related)
    if polish:
        t2 = _llm_polish("threads", threads, title, keyword)
        i2 = _llm_polish("instagram", instagram, title, keyword)
        if t2:
            threads = t2
        if i2:
            instagram = i2
    hook = f"요즘 {keyword} 뭔지 앎? →"
    short = f"[{keyword}] {title}\n{link}"
    return {
        "threads": threads,
        "instagram": instagram,
        "hook": hook,
        "short": short,
        "hashtags": " ".join(
            f"#{w}" for w in [keyword.replace(" ", ""), "실무팁", "정보글", "직장인", platform]
        ),
    }
