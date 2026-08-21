export type TossShopCategory =
  | "food"
  | "beauty"
  | "home"
  | "digital"
  | "fashion"
  | "health";

export type TossShopMerchant = {
  id: string;
  shopName: string;
  category: TossShopCategory;
  bankName?: string;
  bankAccount?: string;
  createdAt: string;
  /** Per-merchant Toss Shopping API keys (server-side only). */
  apiAccessKey?: string;
  apiSecretKey?: string;
  apiSandbox?: boolean;
  apiConnectedAt?: string;
  dataSource?: "demo" | "live" | "live_partial";
  lastSyncAt?: string;
  lastSyncError?: string;
};

export type TossShopPlan = "owner" | "trial" | "free" | "pro";

export type TossShopSubscriptionStatus =
  | "active"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused";

export type TossShopAccount = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  merchantId: string;
  createdAt: string;
  plan?: TossShopPlan;
  trialEndsAt?: string;
  /** Pro subscription expiry (monthly). */
  proExpiresAt?: string;
  /** Lemon Squeezy subscription (Pro billing). */
  lsCustomerId?: string;
  lsSubscriptionId?: string;
  subscriptionStatus?: TossShopSubscriptionStatus;
  /** Daily usage counters (UTC date key). */
  usage?: {
    date: string;
    keywordAnalyses: number;
  };
};

export type MarketKeywordMetrics = {
  keyword: string;
  searchVolume: number;
  productCount: number;
  avgPriceKrw: number;
  competitionIntensity: number;
  updatedAt: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  category: TossShopCategory;
  priceKrw: number;
  reviewCount: number;
  rating: number;
  sellerName: string;
  imageUrl?: string;
  rank: number;
  rankPrev: number;
  updatedAt: string;
};

export type PriceSnapshot = {
  productId: string;
  date: string;
  priceKrw: number;
  rank: number;
  reviewCount: number;
};

export type WatchlistItem = {
  id: string;
  productId: string;
  /** Keyword exposure rank tracking (Item Scout style). */
  keyword?: string;
  alertPriceDropPct?: number;
  alertRankUp?: number;
  addedAt: string;
};

export type TrackedKeyword = {
  id: string;
  keyword: string;
  myProductId?: string;
  addedAt: string;
};

export type KeywordSnapshot = {
  keyword: string;
  date: string;
  searchVolume: number;
  competingProducts: number;
  myRank?: number;
  topProductIds: string[];
};

export type CompetitionGrade = "excellent" | "good" | "fair" | "poor";

export type KeywordAnalysis = {
  keyword: string;
  difficulty: "easy" | "medium" | "hard";
  searchVolume: number;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  mobileRatio: number;
  competingProducts: number;
  competitionIntensity: number;
  competitionGrade: CompetitionGrade;
  avgPriceKrw: number;
  sixMonthSales: number;
  sixMonthRevenue: number;
  realProductRatio: number;
  overseasProductRatio: number;
  topProducts: Array<{
    id: string;
    name: string;
    rank: number;
    priceKrw: number;
    reviewCount: number;
    sellerName: string;
  }>;
  suggestions: Array<{ keyword: string; searchVolume: number; competitionIntensity: number }>;
  trend: number[];
  analyzedAt: string;
};

export type Competitor = {
  id: string;
  sellerName: string;
  shopUrl?: string;
  trackedProductIds: string[];
  addedAt: string;
};

export type AlertChannel = "in_app" | "email";

export type CompetitorAlertRule = {
  id: string;
  competitorId: string;
  metric: "price_drop" | "price_rise" | "rank_up" | "rank_down" | "new_product";
  threshold?: number;
  channel: AlertChannel;
  enabled: boolean;
  createdAt: string;
};

export type CompetitorAlert = {
  id: string;
  ruleId: string;
  competitorId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type SettlementStatus = "pending" | "matched" | "discrepancy";

export type SettlementRow = {
  id: string;
  orderId: string;
  orderDate: string;
  productName: string;
  grossKrw: number;
  platformFeeKrw: number;
  shippingFeeKrw: number;
  expectedPayoutKrw: number;
  actualPayoutKrw?: number;
  status: SettlementStatus;
  purchaseConfirmedAt?: string;
  payoutDate?: string;
  note?: string;
};

export type MerchantData = {
  watchlist: WatchlistItem[];
  keywords: TrackedKeyword[];
  competitors: Competitor[];
  alertRules: CompetitorAlertRule[];
  alerts: CompetitorAlert[];
  settlements: SettlementRow[];
  /** Last generated consignment picks (date key). */
  consignmentPicks?: ConsignmentPick[];
  consignmentDate?: string;
  importPicks?: ImportPick[];
  importDate?: string;
};

export type CompetitorPriceRef = {
  sellerName: string;
  priceKrw: number;
  rank: number;
};

export type AnalysisSignal = {
  label: string;
  impact: "positive" | "neutral" | "negative";
  detail: string;
  weight?: number;
};

export type PricingBreakdown = {
  supplierCostKrw: number;
  platformFeesKrw: number;
  netProfitKrw: number;
  marginPct: number;
  strategy: string;
  priceFloorKrw: number;
  priceCeilingKrw: number;
  competitorLowKrw: number;
  competitorMedianKrw: number;
  competitorHighKrw: number;
  undercutKrw: number;
};

export type CompetitorInsight = CompetitorPriceRef & {
  reviewCount?: number;
  rating?: number;
  priceGapPct?: number;
  threat?: "low" | "medium" | "high";
};

export type ConsignmentPick = {
  id: string;
  keyword: string;
  productName: string;
  suggestedTitle: string;
  category: TossShopCategory;
  supplierCostKrw: number;
  recommendedPriceKrw: number;
  competitorPrices: CompetitorPriceRef[];
  competitorInsights?: CompetitorInsight[];
  searchVolume: number;
  competitionIntensity: number;
  estimatedMarginPct: number;
  estimatedDailyProfitKrw: number;
  estimatedDailyUnits?: number;
  confidenceScore: number;
  winScore?: number;
  reason: string;
  pricing?: PricingBreakdown;
  signals?: AnalysisSignal[];
  actionSteps?: string[];
  risks?: string[];
};

export type ImportPick = {
  id: string;
  productName: string;
  suggestedTitle: string;
  category: TossShopCategory;
  sourceCountry: string;
  sourcePriceUsd: number;
  landedCostKrw: number;
  recommendedPriceKrw: number;
  marketAvgPriceKrw: number;
  estimatedMarginPct: number;
  estimatedMonthlyUnits: number;
  estimatedMonthlyProfitKrw: number;
  confidenceScore: number;
  winScore?: number;
  reason: string;
  keyword: string;
  pricing?: PricingBreakdown;
  signals?: AnalysisSignal[];
  actionSteps?: string[];
  risks?: string[];
  competitorInsights?: CompetitorInsight[];
  landedBreakdown?: {
    productKrw: number;
    shippingKrw: number;
    dutyKrw: number;
  };
};

export type TossShopStore = {
  accounts: TossShopAccount[];
  merchants: TossShopMerchant[];
  merchantData: Record<string, MerchantData>;
  catalog: CatalogProduct[];
  priceHistory: Record<string, PriceSnapshot[]>;
  keywordHistory: Record<string, KeywordSnapshot[]>;
  /** Aggregated market intelligence from catalog sync. */
  marketKeywords?: Record<string, MarketKeywordMetrics>;
  marketCollectedAt?: string;
  marketProductCount?: number;
};
