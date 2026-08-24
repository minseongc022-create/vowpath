import type { SupplierQuality } from "./supplier-quality";

export type WholesalePlatform = "domeggook" | "domeme" | "1688" | "taobao" | "rakuten" | "yahoo_jp";

export type WholesaleListing = {
  platform: WholesalePlatform;
  itemNo?: number;
  title: string;
  unitPriceKrw: number;
  shippingFeeKrw: number;
  moq: number;
  url: string;
  imageUrl?: string;
  sellerId?: string;
  sellerNick?: string;
  freeShipping: boolean;
  source: "live" | "estimated";
  marginVsTossPct?: number;
  /** 공급사 등급·출고속도 (live 응답에서 판독; 미확인이면 verified:false) */
  supplierQuality?: SupplierQuality;
  /**
   * 공급처 반품·수거 안내 원문 (상세페이지·공지 등).
   *
   * 도매꾹 검색 API(getItemList)는 이 텍스트를 주지 않으므로 보통 비어 있다.
   * 비어 있으면 supplier-return-policy가 `unknown`으로 판정하고, 반품지 결정이
   * fail-closed로 막힌다(공급처 전용 주소 또는 셀러 자체 주소 선언 필요).
   * 플랫폼별 상세 조회를 붙이면 여기에 채워 넣으면 된다.
   */
  policyText?: string;
};

export type ImportSourceListing = {
  platform: WholesalePlatform;
  country: "중국" | "일본" | "베트남" | "미국";
  title: string;
  sourcePriceUsd: number;
  sourcePriceKrw: number;
  url: string;
  searchUrl: string;
  imageUrl?: string;
  source: "live" | "estimated";
  landedCostKrw?: number;
  estimatedMarginPct?: number;
};

export type WholesaleSearchResult = {
  keyword: string;
  listings: WholesaleListing[];
  bestMatch: WholesaleListing | null;
  searchedAt: string;
  apiConfigured: boolean;
};

export type ImportSourceResult = {
  keyword: string;
  primaryCountry: "중국" | "일본";
  china: ImportSourceListing[];
  japan: ImportSourceListing[];
  bestMatch: ImportSourceListing | null;
  sourcingBrief: string;
  searchedAt: string;
};
