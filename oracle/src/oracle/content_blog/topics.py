"""High-CPC Korean topic bank — commercial intent, factual angles only."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Topic:
    title: str  # click-worthy but honest
    keyword: str  # primary SEO keyword (high commercial intent)
    secondary: list[str] = field(default_factory=list)
    search_intent: str = ""
    outline: list[str] = field(default_factory=list)
    cpc_tier: str = "high"  # high | mid


# Platform → topic pools (rotate). Keywords lean high-CPC KR verticals:
# 대출/보험/연말정산/이직연봉/신용카드/청약/AI도구 등
NAVER_TOPICS: list[Topic] = [
    Topic(
        title="신용대출 받기 전에 반드시 확인할 3가지 — 거절당하는 사람 공통점",
        keyword="신용대출",
        secondary=["대출 한도", "신용점수", "금리 비교"],
        search_intent="신용대출 조건·한도·금리 실무 체크",
        outline=["거절 원인", "한도 올리는 순서", "금리 비교 방법", "주의 약관", "체크리스트"],
    ),
    Topic(
        title="연말정산 환급 놓치는 항목 TOP — 직장인이 지금 챙길 서류",
        keyword="연말정산",
        secondary=["연말정산 환급", "소득공제", "세액공제"],
        search_intent="연말정산 환급·공제 실무",
        outline=["자주 누락", "서류 리스트", "일정", "실수", "체크리스트"],
    ),
    Topic(
        title="자동차보험 갱신 전 비교하면 아끼는 구조 — 특약부터 정리",
        keyword="자동차보험",
        secondary=["보험 비교", "다이렉트 보험", "특약"],
        search_intent="자동차보험 비교·갱신",
        outline=["갱신 타이밍", "특약 정리", "비교 순서", "착각", "체크리스트"],
    ),
    Topic(
        title="카드값 돌려막는 달, 먼저 끊어야 할 이자 구멍 4가지",
        keyword="신용카드 이자",
        secondary=["리볼빙", "현금서비스", "카드론"],
        search_intent="신용카드 이자·리볼빙 탈출",
        outline=["이자 구조", "리볼빙", "대체 순서", "예산", "체크리스트"],
    ),
    Topic(
        title="전세자금대출 심사에서 걸리는 지점 — 서류·한도·일정 한 장 정리",
        keyword="전세자금대출",
        secondary=["전세대출 한도", "버팀목", "은행 심사"],
        search_intent="전세자금대출 조건",
        outline=["자격", "서류", "한도", "일정", "체크리스트"],
    ),
    Topic(
        title="실비보험 청구 전 확인 — 서류·특약·중복청구 헷갈리는 포인트",
        keyword="실비보험 청구",
        secondary=["실손보험", "보험금 청구", "병원비"],
        search_intent="실비보험 청구 방법",
        outline=["청구 조건", "필요 서류", "특약", "거절 사례", "체크리스트"],
    ),
    Topic(
        title="주택담보대출 금리 비교할 때 — 중도상환·우대조건부터 보는 순서",
        keyword="주택담보대출",
        secondary=["주담대 금리", "중도상환수수료", "대출 갈아타기"],
        search_intent="주택담보대출 금리 비교",
        outline=["금리 구조", "우대조건", "수수료", "갈아타기", "체크리스트"],
    ),
]

WORDPRESS_TOPICS: list[Topic] = [
    Topic(
        title="이직 연봉 협상, '희망 연봉' 말하기 전에 준비할 숫자 3개",
        keyword="이직 연봉 협상",
        secondary=["연봉 인상", "이직 준비", "처우 협상"],
        search_intent="이직 연봉 협상 실무",
        outline=["시장가", "근거 숫자", "협상 문장", "실패 패턴", "체크리스트"],
    ),
    Topic(
        title="면접에서 '이직 사유' 물으면 — 감정보다 이 프레임으로 답하라",
        keyword="이직 면접",
        secondary=["면접 질문", "퇴사 사유", "이직 준비"],
        search_intent="이직 면접 답변",
        outline=["프레임", "예시 답변", "피해야 할 말", "연습법", "체크리스트"],
    ),
    Topic(
        title="사이드프로젝트로 포트폴리오 만들 때 — 채용 담당자가 보는 포인트",
        keyword="사이드프로젝트",
        secondary=["개발 포트폴리오", "이직 포트폴리오", "개인 프로젝트"],
        search_intent="사이드프로젝트 포트폴리오",
        outline=["목표 설정", "보여줄 것", "문서화", "시간 관리", "체크리스트"],
    ),
    Topic(
        title="야근이 줄지 않는 팀의 공통점 — WIP 제한부터 다시 짜는 법",
        keyword="업무 우선순위",
        secondary=["생산성", "WIP", "일잘러"],
        search_intent="업무 우선순위·생산성",
        outline=["잘못된 바쁨", "WIP", "MIT", "회의", "체크리스트"],
    ),
    Topic(
        title="연봉 인상 면담 전에 가져갈 자료 — 성과를 숫자로 바꾸는 템플릿",
        keyword="연봉 인상",
        secondary=["연봉 협상", "성과 평가", "처우 개선"],
        search_intent="연봉 인상 협상",
        outline=["성과 수치화", "시장 조사", "면담 스크립트", "대안", "체크리스트"],
    ),
    Topic(
        title="이력서 경력기술서, 채용담당자가 3초 만에 걸러내는 표현",
        keyword="이력서 경력기술서",
        secondary=["이력서 작성", "경력기술", "이직 서류"],
        search_intent="이력서 경력기술서 작성",
        outline=["나쁜 표현", "좋은 구조", "수치화", "예시", "체크리스트"],
    ),
]

BLOGGER_TOPICS: list[Topic] = [
    Topic(
        title="ChatGPT 유료 결제 전 — 업무용으로 쓸 때 꼭 정할 사용 규칙",
        keyword="ChatGPT 업무",
        secondary=["생성형 AI", "AI 툴", "프롬프트"],
        search_intent="ChatGPT 업무 활용",
        outline=["결제 전 기준", "보안", "프롬프트", "한계", "체크리스트"],
    ),
    Topic(
        title="노코드로 홈페이지 만들다 막히는 지점 — 도메인·결제·SEO 순서",
        keyword="노코드 홈페이지",
        secondary=["노션 사이트", "웹플로우", "SEO"],
        search_intent="노코드 홈페이지 제작",
        outline=["도구 선택", "도메인", "결제", "SEO", "체크리스트"],
    ),
    Topic(
        title="API 연동 사고의 절반은 '계약'을 안 읽어서다 — 체크 5줄",
        keyword="API 연동",
        secondary=["REST API", "웹훅", "연동 오류"],
        search_intent="API 연동 기초",
        outline=["계약이란", "인증", "에러", "타임아웃", "체크리스트"],
    ),
    Topic(
        title="구글 애드센스 승인 전에 정리할 콘텐츠 구조 — 거절 사유부터",
        keyword="애드센스 승인",
        secondary=["블로그 수익", "애드센스 거절", "콘텐츠 정책"],
        search_intent="애드센스 승인 준비",
        outline=["정책", "콘텐츠 밀도", "네비", "약관", "체크리스트"],
    ),
    Topic(
        title="워드프레스 블로그 SEO — 검색 안 되는 글이 공통으로 빠진 것",
        keyword="워드프레스 SEO",
        secondary=["블로그 SEO", "검색엔진 최적화", "메타 설명"],
        search_intent="워드프레스 SEO 설정",
        outline=["제목·슬러그", "메타", "내부링크", "속도", "체크리스트"],
    ),
    Topic(
        title="도메인·호스팅 고르기 전에 — 애드센스·SEO에 영향 주는 선택",
        keyword="블로그 도메인",
        secondary=["호스팅", "도메인 연결", "블로그 시작"],
        search_intent="블로그 도메인 호스팅",
        outline=["도메인 기준", "호스팅", "SSL", "이전 비용", "체크리스트"],
    ),
]


def topics_for(platform: str) -> list[Topic]:
    if platform == "naver":
        return NAVER_TOPICS
    if platform == "wordpress":
        return WORDPRESS_TOPICS
    return BLOGGER_TOPICS
