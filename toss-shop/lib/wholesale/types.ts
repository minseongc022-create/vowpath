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
