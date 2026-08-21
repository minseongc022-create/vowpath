import { SELLER_PULSE_BRAND } from "./brand";

export const SP_STRINGS = {
  brand: SELLER_PULSE_BRAND.name,
  brandEn: SELLER_PULSE_BRAND.nameEn,
  tagline: SELLER_PULSE_BRAND.tagline,
  navHome: "홈",
  navRankings: "랭킹·가격",
  navKeywords: "키워드",
  navCompetitors: "경쟁사",
  navSettlements: "정산",
  navDashboard: "대시보드",
  navLogin: "로그인",
  navLogout: "로그아웃",
  ctaStart: "무료로 시작하기",
  ctaDemo: "데모 계정으로 체험",
  heroTitle: "토스쇼핑 셀러 데이터, 1분마다 갱신",
  heroSubtitle:
    "셀러펄스는 랭킹·가격·키워드·경쟁사·정산을 거의 실시간으로 모니터링하는 토스쇼핑 셀러 전용 대시보드입니다.",
  demoEmail: "demo@sellerpulse.local",
  demoPassword: "demo1234",
  footer: "셀러펄스(Seller Pulse) — 토스쇼핑 공식 서비스가 아닌 독립 도구입니다.",
  syncInterval: "1분마다 자동 동기화",
} as const;

/** @deprecated use SP_STRINGS */
export const TS_STRINGS = SP_STRINGS;
