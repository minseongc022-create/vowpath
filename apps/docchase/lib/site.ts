export const SITE = {
  name: "수임체크",
  nameEn: "SuimCheck",
  tagline: "수임처 자료 요청을 시스템이 대신합니다",
  url: "https://suimcheck.kr",
  supportEmail: "hello@suimcheck.kr",
} as const;

export const PRICING = [
  {
    id: "starter" as const,
    name: "스타터",
    price: "79,000",
    blurb: "1인 기장·소형 사무소",
    clients: "수임 30곳까지",
    features: [
      "수임처 CSV 등록",
      "마감일 기준 자동 1·2차 요청",
      "제출 현황판",
      "정보성 알림톡 템플릿",
      "발송·수신거부 로그",
    ],
    cta: "14일 체험 시작",
    highlight: false,
  },
  {
    id: "standard" as const,
    name: "스탠다드",
    price: "129,000",
    blurb: "사무원 1명 분량의 독촉을 대체",
    clients: "수임 80곳까지",
    features: [
      "스타터 전체 포함",
      "자료 종류별 체크리스트",
      "마감 D-7 / D-3 / D-1 스케줄",
      "미제출만 재발송",
      "월간 회수율 리포트",
    ],
    cta: "가장 많이 선택",
    highlight: true,
  },
  {
    id: "pro" as const,
    name: "프로",
    price: "199,000",
    blurb: "다수 수임·마감 집중 사무소",
    clients: "수임 200곳까지",
    features: [
      "스탠다드 전체 포함",
      "복수 담당자 계정",
      "거래처별 맞춤 문구",
      "우선 템플릿 심사 지원",
      "온보딩 세팅 대행 1회",
    ],
    cta: "프로로 시작",
    highlight: false,
  },
] as const;
