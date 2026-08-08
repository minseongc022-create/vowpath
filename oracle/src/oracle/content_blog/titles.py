"""Click-maximizing but honest professional titles."""

from __future__ import annotations

import re

from oracle.llm.client import chat as llm_chat


TEMPLATES = [
    "{kw} 하기 전에 꼭 봐야 할 {n}가지 — 놓치면 비용이 커지는 지점",
    "{kw}, 검색만 하다 끝나는 사람들이 공통으로 모르는 것",
    "{kw} 정리: 조건·순서·서류만 제대로 보면 판단이 빨라진다",
    "지금 {kw} 찾는 이유 있는 사람용 — 실무 체크리스트",
    "{kw}에서 거절·실패하는 패턴부터 끊는 법",
]


def _template_title(keyword: str, angle: str) -> str:
    import random

    t = random.choice(TEMPLATES).format(kw=keyword, n=3)
    # Prefer angle if already strong
    if angle and ("—" in angle or "?" in angle or "하는" in angle):
        # tighten bait words that quality gate bans
        cleaned = re.sub(r"99%가 모르는|충격 반전|속보|단독:", "", angle).strip()
        if len(cleaned) >= 12:
            return cleaned
    return t


def make_click_title(keyword: str, angle: str, search_intent: str = "") -> str:
    base = _template_title(keyword, angle)
    try:
        resp = llm_chat(
            [
                {
                    "role": "system",
                    "content": (
                        "한국 블로그 SEO 헤드라인 전문가. "
                        "전문적이면서도 클릭을 유도하는 제목 1개만 출력. "
                        "금지: 속보, 단독, 확정 수익, 99%가 모르는, 거짓 통계. "
                        "허용: 궁금증, 손실회피, 구체 숫자(3가지 등), 대시(—). "
                        "제목만, 따옴표 없이."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"키워드:{keyword}\n의도:{search_intent}\n초안:{angle or base}\n"
                        "더 클릭되게 다듬어줘."
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=80,
            json_mode=False,
        )
        if resp.ok and (resp.text or "").strip():
            title = resp.text.strip().splitlines()[0].strip().strip('"“”')
            title = re.sub(r"^#\s*", "", title)
            if 8 <= len(title) <= 70:
                return title
    except Exception:
        pass
    return base
