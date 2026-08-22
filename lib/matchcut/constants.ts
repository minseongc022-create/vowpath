/** 매칭컷 — 해외 소싱 셀러용 실사진·URL 옵션 매칭 + 상세컷 생성 */
export const MATCHCUT = {
  name: "매칭컷",
  nameEn: "MatchCut",
  tagline: "실사진으로 맞는 옵션을 찾고, 새로 찍은 상세컷을 만듭니다",
  description:
    "1688·타오바오 URL과 실제 받은 상품 사진으로 틀린 갤러리 속 옵션을 자동 매칭하고, 쿠팡·스마트스토어 규격 상세 이미지를 생성합니다.",
  routes: {
    home: "/matchcut",
    legacy: "/sourcing",
  },
  api: {
    scan: "/api/matchcut/scan",
    match: "/api/matchcut/match",
    generate: "/api/matchcut/generate",
    export: "/api/matchcut/export",
  },
} as const;

export type MarketPlatform = "coupang" | "smartstore" | "toss" | "both";

export type MarketImageSpec = {
  id: string;
  label: string;
  width: number;
  height: number;
  maxBytes: number;
  format: "jpeg" | "png";
  quality: number;
};

export const MARKET_SPECS: Record<"coupang" | "smartstore" | "toss", MarketImageSpec[]> = {
  coupang: [
    {
      id: "main",
      label: "대표이미지",
      width: 1000,
      height: 1000,
      maxBytes: 10 * 1024 * 1024,
      format: "jpeg",
      quality: 90,
    },
    {
      id: "detail",
      label: "상세이미지",
      width: 780,
      height: 780,
      maxBytes: 10 * 1024 * 1024,
      format: "jpeg",
      quality: 88,
    },
  ],
  smartstore: [
    {
      id: "main",
      label: "대표이미지",
      width: 1000,
      height: 1000,
      maxBytes: 20 * 1024 * 1024,
      format: "jpeg",
      quality: 90,
    },
    {
      id: "detail",
      label: "추가이미지",
      width: 1000,
      height: 1000,
      maxBytes: 20 * 1024 * 1024,
      format: "jpeg",
      quality: 88,
    },
  ],
  toss: [
    {
      id: "main",
      label: "대표이미지",
      width: 1000,
      height: 1000,
      maxBytes: 10 * 1024 * 1024,
      format: "jpeg",
      quality: 90,
    },
    {
      id: "detail",
      label: "상세이미지",
      width: 750,
      height: 750,
      maxBytes: 10 * 1024 * 1024,
      format: "jpeg",
      quality: 88,
    },
  ],
};
