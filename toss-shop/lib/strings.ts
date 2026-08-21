import { EFFIROAD_BRAND } from "./brand";

export const SP_STRINGS = {
  brand: EFFIROAD_BRAND.nameKo,
  brandEn: EFFIROAD_BRAND.name,
  tagline: EFFIROAD_BRAND.tagline,
  navHome: "홈",
  navDiscovery: "발굴",
  navRankings: "랭킹 추적",
  navKeywords: "키워드 분석",
  navCompetitors: "경쟁사",
  navSettlements: "정산",
  navDashboard: "대시보드",
  navLogin: "로그인",
  navLogout: "로그아웃",
  ctaStart: "시작하기",
  ctaDemo: "데모로 체험",
  ctaApiConnect: "토스쇼핑 API 연동",
  ctaApiConnectDesc: "셀러센터에서 발급한 API 키를 입력하세요",
  heroTitle: "토스쇼핑 셀러를 위한 올인원 대시보드",
  heroSubtitle:
    "랭킹·가격·키워드·경쟁사·정산을 한곳에서 관리하세요. 에피로드는 토스쇼핑 판매 데이터를 분석하는 독립 도구입니다.",
  demoEmail: "demo@effiroad.local",
  demoPassword: "demo1234",
  footer: "© Effiroad(에피로드). 토스·토스쇼핑·비바리퍼블리카와 제휴·승인 관계가 없는 독립 서비스입니다.",
  legalTitle: "서비스 안내",
  legalShort:
    "에피로드는 토스·토스쇼핑 공식 앱/로그인이 아닙니다. 토스쇼핑 Open API 키를 이용하는 독립 분석 도구입니다.",
  legalBody:
    "에피로드(Effiroad)는 비바리퍼블리카(토스) 및 토스쇼핑과 제휴·승인·위탁 관계가 없는 독립 서비스입니다. '토스쇼핑 API 연동'은 셀러센터에서 발급받은 API 키를 입력하는 기능이며, 토스 계정 OAuth 로그인을 대체하지 않습니다. 토스·토스쇼핑 상표는 각 권리자의 자산입니다.",
} as const;

/** @deprecated use SP_STRINGS */
export const TS_STRINGS = SP_STRINGS;
