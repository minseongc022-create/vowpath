"""SNS traffic copy for Threads / Instagram — one-click paste."""

from __future__ import annotations


def build_social_copies(*, title: str, keyword: str, url: str | None, platform: str) -> dict[str, str]:
    link = url or "(블로그 링크 붙여넣기)"
    tag = keyword.replace(" ", "")
    # Platform-native hooks (honest curiosity, not fake 속보)
    threads = (
        f"{keyword} 검색만 하다가 시간 버린 적 있으면 이거부터.\n\n"
        f"{title}\n\n"
        f"과장 수치 없이, 바로 점검할 체크리스트만 모았습니다.\n"
        f"저장해두고 필요할 때 다시 보세요.\n\n"
        f"링크 → {link}\n\n"
        f"#{tag} #실무팁 #정보글 #체크리스트"
    )
    instagram = (
        f"{title}\n\n"
        f"{keyword} 때문에 헤매는 분들 위해\n"
        f"실무 순서·서류·착각 포인트만 골랐어요.\n\n"
        f"전체 글 링크는 프로필 / Threads에 올려둘게요.\n"
        f"{link}\n\n"
        f".\n.\n.\n"
        f"#{tag} #직장인팁 #실용정보 #정보공유 #블로그추천 #체크리스트"
    )
    hook = f"{keyword}? 이거부터 확인 →"
    short = f"[{keyword}] {title}\n{link}"
    return {
        "threads": threads.strip(),
        "instagram": instagram.strip(),
        "hook": hook,
        "short": short,
        "hashtags": " ".join(f"#{w}" for w in [tag, "실무팁", "정보글", "직장인", platform]),
    }
