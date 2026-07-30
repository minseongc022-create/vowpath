export type MarketChannelId =
  | "coupang"
  | "smartstore"
  | "elevenst"
  | "gmarket"
  | "auction";

export type MarketConnectionStatus = {
  id: MarketChannelId;
  label: string;
  connected: boolean;
  mode: "live" | "draft";
  hint: string;
};

export type ListingDraft = {
  channel: MarketChannelId;
  title: string;
  salePrice: number;
  detailHtml: string;
  imageCount: number;
  payload: Record<string, unknown>;
};

export type RegisterResult = {
  channel: MarketChannelId;
  status: "submitted" | "draft_only" | "error";
  externalId?: string;
  message: string;
  draft?: ListingDraft;
};

export type ListingInput = {
  title: string;
  salePrice: number;
  detailHtml: string;
  /** base64 images (main first) */
  imagesBase64: string[];
  brand?: string;
  manufacturer?: string;
  categoryHint?: string;
  stock?: number;
  /** Optional per-request credentials override */
  credentials?: Record<string, string>;
};

export function getMarketConnectionStatuses(): MarketConnectionStatus[] {
  const coupang =
    !!process.env.COUPANG_ACCESS_KEY?.trim() && !!process.env.COUPANG_SECRET_KEY?.trim();
  const smartstore =
    !!process.env.NAVER_COMMERCE_CLIENT_ID?.trim() &&
    !!process.env.NAVER_COMMERCE_CLIENT_SECRET?.trim();
  const elevenst = !!process.env.ELEVENST_API_KEY?.trim();
  const gmarket = !!process.env.GMARKET_API_KEY?.trim();

  return [
    {
      id: "coupang",
      label: "쿠팡",
      connected: coupang,
      mode: coupang ? "live" : "draft",
      hint: coupang
        ? "Wing Open API 연동됨 — 자동 등록 가능"
        : "COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 설정 시 자동 등록",
    },
    {
      id: "smartstore",
      label: "스마트스토어",
      connected: smartstore,
      mode: smartstore ? "live" : "draft",
      hint: smartstore
        ? "네이버 커머스 API 연동됨 — 자동 등록 가능"
        : "NAVER_COMMERCE_CLIENT_ID / SECRET 설정 시 자동 등록",
    },
    {
      id: "elevenst",
      label: "11번가",
      connected: elevenst,
      mode: elevenst ? "live" : "draft",
      hint: elevenst ? "11번가 API 연동됨" : "ELEVENST_API_KEY 설정 시 자동 등록",
    },
    {
      id: "gmarket",
      label: "G마켓",
      connected: gmarket,
      mode: gmarket ? "live" : "draft",
      hint: gmarket ? "G마켓 API 연동됨" : "GMARKET_API_KEY 설정 시 자동 등록 (또는 드래프트 ZIP)",
    },
    {
      id: "auction",
      label: "옥션",
      connected: gmarket,
      mode: gmarket ? "live" : "draft",
      hint: "G마켓과 동일 ESM 계정 키 사용",
    },
  ];
}
