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

export type ScrapedListing = {
  platform: SourcingPlatform;
  url: string;
  title?: string;
  images: ListingImage[];
  skuOptions: SkuOption[];
  rawImageCount: number;
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
};

export type PipelineResult = {
  listing: ScrapedListing;
  match: MatchResult;
  generatedAngles: GeneratedAngle[];
  detailPageHtml: string;
  detailBundle?: DetailPageBundle;
};
