import type { GiuCategory, GiuDistrict, GiuMarket } from "./types";

/** Incheon focus for KR merchant-first launch. */
export const KR_MERCHANT_DISTRICTS: GiuDistrict[] = [
  "icn_yeonsu",
  "icn_namdong",
  "icn_bupyeong",
  "icn_michuhol",
  "icn_seo",
  "icn_gyeyang",
  "icn_jung",
  "icn_dong",
];

export const VN_DISTRICTS: GiuDistrict[] = [
  "quan_1",
  "quan_3",
  "quan_5",
  "quan_7",
  "quan_10",
  "binh_thanh",
  "phu_nhuan",
];

/** Bakery / cafe magam-sale first. */
export const KR_MERCHANT_CATEGORIES: GiuCategory[] = ["bakery", "cafe", "khac"];

export function isKrMarket(market: GiuMarket | undefined | null): boolean {
  return market === "kr";
}

export function marketTimeZone(market: GiuMarket): string {
  return market === "kr" ? "Asia/Seoul" : "Asia/Ho_Chi_Minh";
}

/** Quick-publish defaults (stored in *Vnd fields; values are KRW). */
export function quickPublishPrices(_market: GiuMarket = "kr"): {
  originalPriceVnd: number;
  salePriceVnd: number;
} {
  return { originalPriceVnd: 12_000, salePriceVnd: 6_000 };
}
