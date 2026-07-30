export type SourcingPlatform = "1688" | "taobao" | "aliexpress" | "unknown";

export type ListingImage = {
  url: string;
  source: "gallery" | "detail" | "sku" | "unknown";
  width?: number;
  height?: number;
};

export type SkuOption = {
  id: string;
  label: string;
  imageUrl?: string;
};

export type ListingAttribute = {
  name: string;
  value: string;
};

export type ScrapedListing = {
  platform: SourcingPlatform;
  url: string;
  /** 원문 제목 (중문 등) */
  title?: string;
  /** 공유 문구·셀러 입력 한국어 제목 */
  titleKo?: string;
  priceText?: string;
  priceCny?: number;
  moq?: string;
  sellerName?: string;
  attributes?: ListingAttribute[];
  description?: string;
  /** 셀러 메모 */
  notes?: string;
  images: ListingImage[];
  skuOptions: SkuOption[];
  rawImageCount: number;
  /** 자동 수집이 막혔거나 부정확할 때 안내 */
  scrapeWarning?: string;
};

export type MatchCandidate = {
  imageUrl: string;
  skuId?: string;
  skuLabel?: string;
  score: number;
  reason: string;
};

export type MatchResult = {
  bestMatch: MatchCandidate | null;
  candidates: MatchCandidate[];
  referenceDescription: string;
};

export type GeneratedAngle = {
  angle: string;
  prompt: string;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  /** QA failed but image still exported — user can AI-fix */
  needsFix?: boolean;
  issues?: string[];
  qualityScore?: number;
  retryCount?: number;
};

export type { ProductAnalysis, ProductCategory } from "./product-analysis";
export type { CompetitorInsight, CompetitorProduct } from "./competitor-research";
export type { DetailCopy } from "./detail-copy";

export type DetailPageBundle = {
  productAnalysis: import("./product-analysis").ProductAnalysis;
  competitorInsight: import("./competitor-research").CompetitorInsight;
  detailCopy: import("./detail-copy").DetailCopy;
  designToolkit?: import("./design-toolkit").DesignToolkit;
};

export type PipelineResult = {
  listing: ScrapedListing;
  match: MatchResult;
  generatedAngles: GeneratedAngle[];
  thumbnails?: import("./thumbnail-generate").ListingThumbnail[];
  detailPageHtml: string;
  detailBundle?: DetailPageBundle;
};
