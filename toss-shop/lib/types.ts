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

export type TossShopPlan = "trial" | "free" | "pro";

export type TossShopAccount = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  merchantId: string;
  createdAt: string;
  plan?: TossShopPlan;
  trialEndsAt?: string;
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

export type KeywordAnalysis = {
  keyword: string;
  difficulty: "easy" | "medium" | "hard";
  searchVolume: number;
  competingProducts: number;
  avgPriceKrw: number;
  topProducts: Array<{ id: string; name: string; rank: number; priceKrw: number }>;
  suggestions: string[];
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
};

export type TossShopStore = {
  accounts: TossShopAccount[];
  merchants: TossShopMerchant[];
  merchantData: Record<string, MerchantData>;
  catalog: CatalogProduct[];
  priceHistory: Record<string, PriceSnapshot[]>;
  keywordHistory: Record<string, KeywordSnapshot[]>;
};
