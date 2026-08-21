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
  ctaDemo: "데모로 둘러보기",
  ctaTossConnect: "토스 셀러 연동",
  heroTitle: "토스쇼핑 셀러를 위한 올인원 대시보드",
  heroSubtitle:
    "랭킹·가격·키워드·경쟁사·정산을 한곳에서 관리하세요. 셀러펄스는 토스쇼핑 판매 데이터를 분석하고 의사결정을 돕는 독립 도구입니다.",
  demoEmail: "demo@sellerpulse.local",
  demoPassword: "demo1234",
  footer: "셀러펄스(Seller Pulse) — 토스쇼핑 공식 서비스가 아닌 독립 도구입니다.",
} as const;

/** @deprecated use SP_STRINGS */
export const TS_STRINGS = SP_STRINGS;
