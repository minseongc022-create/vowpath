/**
 * 채비 — "말만 하세요. 채비는 저희가."
 *
 * 다른 제품(효이로드·자비스·마노·토픽·런)과 코드·라우팅·저장소를 전혀
 * 공유하지 않는 독립 제품이다. 여기 상수를 다른 앱에서 import 하지 말 것.
 */
export const CHAEBI_BRAND = {
  /** 표시 이름 */
  name: "채비",
  nameEn: "Chaebi",
  fullName: "채비 — 상황만 말하면 다 준비됩니다",
  tagline: "검색하지 마세요. 상황만 말하세요.",
  subline: "기념일·데이트·선물, 알아서 다 채비해 드립니다.",
  /** 앱 루트 경로 */
  basePath: "/chaebi",
  themeColor: "#5E3550",
  locale: "ko_KR",
} as const;

export const CHAEBI_ROUTES = {
  home: "/chaebi",
  plans: "/chaebi/plans",
  plan: (id: string) => `/chaebi/plan/${id}`,
  progress: (id: string) => `/chaebi/plan/${id}/progress`,
} as const;
