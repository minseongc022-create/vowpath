/** 매칭컷 (MatchCut) — 해외 소싱 셀러용 실사진·URL 옵션 매칭 + 상세컷 */

export const MATCHCUT = {
  name: "매칭컷",
  nameEn: "MatchCut",
  tagline: "실사진으로 맞는 옵션을 찾고, 새로 찍은 상세컷을 만듭니다",
  description:
    "1688·타오바오 URL과 실제 받은 상품 사진으로 틀린 갤러리 속 옵션을 자동 매칭하고, 쿠팡·스마트스토어 규격 상세 이미지를 생성합니다.",
  contactEmail: "hello@matchcut.kr",
  url: process.env.NEXT_PUBLIC_MATCHCUT_URL?.trim() || "/matchcut",
} as const;

export const MATCHCUT_ROUTES = {
  home: "/matchcut",
  pricing: "/matchcut/pricing",
  signup: "/matchcut/signup",
  login: "/matchcut/login",
  app: "/matchcut/app",
  credits: "/matchcut/app/credits",
  projects: "/matchcut/app/projects",
  adCard: "/matchcut/app/ad-card",
  markets: "/matchcut/app/markets",
} as const;

export const MATCHCUT_API = {
  signup: "/api/matchcut/auth/signup",
  login: "/api/matchcut/auth/login",
  logout: "/api/matchcut/auth/logout",
  me: "/api/matchcut/me",
  credits: "/api/matchcut/credits",
  checkout: "/api/matchcut/checkout",
  projects: "/api/matchcut/projects",
  scan: "/api/matchcut/scan",
  match: "/api/matchcut/match",
  generate: "/api/matchcut/generate",
  export: "/api/matchcut/export",
  fixAngle: "/api/matchcut/fix-angle",
  pricing: "/api/matchcut/pricing",
  marketsStatus: "/api/matchcut/markets/status",
  marketsRegister: "/api/matchcut/markets/register",
  adCard: "/api/matchcut/ad-card",
  rematch: "/api/matchcut/rematch",
  imageProxy: "/api/matchcut/image-proxy",
} as const;

/** 크리에이지식: 구독 크레딧(월 초기화) + 단건 크레딧(영구) */
export const CREDIT_COSTS = {
  /** URL 스캔 + 실사진 비전 매칭 (프로젝트 개설에 해당) */
  match: 20,
  /**
   * @deprecated use ANGLE_PACKAGES — kept for fix/ad unit economics
   * 상세컷 단가 참고치 (패키지 할인 전)
   */
  angle: 12,
  /** 이상한 컷 AI 수정 1회 */
  fixAngle: 6,
  /** 경쟁가·마진 추천 */
  pricing: 4,
  /** 마켓 자동등록(채널당) */
  marketRegister: 8,
  /** 마케팅 광고카드 1장 */
  adCard: 12,
  /** 마켓 썸네일 1장 — 패키지에 포함되어 체감 혜자 */
  thumbnail: 5,
  /** ZIP/HTML 내보내기 — 업계 관행상 무료 */
  export: 0,
} as const;

/**
 * 상세컷 패키지 (썸네일 3장 포함).
 * listCredits = 단가 합산 정가 느낌, credits = 실제 차감 (볼륨 할인 → 혜자 체감).
 * API 원가 대비 여유 마진 확보 (이미지 생성 고원가 가정).
 */
export const ANGLE_PACKAGES = [
  { angles: 1, credits: 24, listCredits: 36, label: "1장", badge: null as string | null },
  { angles: 2, credits: 36, listCredits: 54, label: "2장", badge: null },
  { angles: 3, credits: 45, listCredits: 72, label: "3장", badge: "인기" },
  { angles: 4, credits: 52, listCredits: 90, label: "4장", badge: null },
  { angles: 5, credits: 56, listCredits: 108, label: "5장", badge: "혜자" },
] as const;

export type AnglePackage = (typeof ANGLE_PACKAGES)[number];

export function getAnglePackage(angles: number): AnglePackage {
  const n = Math.min(5, Math.max(1, Math.round(angles)));
  return ANGLE_PACKAGES.find((p) => p.angles === n) ?? ANGLE_PACKAGES[2]!;
}

/** 매칭만 */
export function estimateMatchCredits(): number {
  return CREDIT_COSTS.match;
}

/** 매칭 + 상세컷 패키지(썸네일 포함) */
export function estimateRunCredits(maxAngles: number): number {
  return CREDIT_COSTS.match + getAnglePackage(maxAngles).credits;
}

/** 생성 단계만 (이미 매칭 후) */
export function estimateGenerateCredits(maxAngles: number): number {
  return getAnglePackage(maxAngles).credits;
}

export type CreditPackId =
  | "welcome"
  | "pack_60"
  | "pack_150"
  | "pack_500"
  | "sub_starter"
  | "sub_pro"
  | "sub_business"
  | "topup_50";

export type CreditPack = {
  id: CreditPackId;
  name: string;
  credits: number;
  priceKrw: number;
  type: "permanent" | "subscription" | "topup";
  badge?: string;
  description: string;
};

/** 사용자-facing 가격 (저렴) — API 원가 대비 마진 확보용 크레딧 소모량 설계 */
export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "pack_60",
    name: "스타터 팩",
    credits: 60,
    priceKrw: 7900,
    type: "permanent",
    description: "영구 보관 · 소싱 1~2건",
  },
  {
    id: "pack_150",
    name: "셀러 팩",
    credits: 150,
    priceKrw: 14900,
    type: "permanent",
    badge: "인기",
    description: "영구 보관 · 소싱 3~4건",
  },
  {
    id: "pack_500",
    name: "파워 팩",
    credits: 500,
    priceKrw: 39900,
    type: "permanent",
    description: "영구 보관 · 대량 소싱",
  },
];

export const SUBSCRIPTION_PLANS: CreditPack[] = [
  {
    id: "sub_starter",
    name: "스타터",
    credits: 120,
    priceKrw: 14900,
    type: "subscription",
    description: "월 120크레딧 · 매월 초기화",
  },
  {
    id: "sub_pro",
    name: "프로",
    credits: 400,
    priceKrw: 39900,
    type: "subscription",
    badge: "추천",
    description: "월 400크레딧 · 매월 초기화",
  },
  {
    id: "sub_business",
    name: "비즈니스",
    credits: 1200,
    priceKrw: 89900,
    type: "subscription",
    description: "월 1,200크레딧 · 팀·대량 셀러",
  },
];

export const TOPUP_PACK: CreditPack = {
  id: "topup_50",
  name: "추가 충전",
  credits: 50,
  priceKrw: 4900,
  type: "topup",
  description: "구독 회원 전용 · 영구 보관",
};

export const WELCOME_CREDITS = 30;

export type MarketPlatform = "coupang" | "smartstore" | "both";

export type MarketImageSpec = {
  id: string;
  label: string;
  width: number;
  height: number;
  maxBytes: number;
  format: "jpeg" | "png";
  quality: number;
};

export const MARKET_SPECS: Record<"coupang" | "smartstore", MarketImageSpec[]> = {
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
};

export function packById(id: string): CreditPack | undefined {
  return [...CREDIT_PACKS, ...SUBSCRIPTION_PLANS, TOPUP_PACK].find((p) => p.id === id);
}
