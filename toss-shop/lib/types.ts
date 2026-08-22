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

export type CompetitorLandscape = {
  count: number;
  priceSpreadPct: number;
  avgReviewCount: number;
  avgRating: number;
  lowThreatCount: number;
  highThreatCount: number;
  dominance: "fragmented" | "balanced" | "concentrated";
};

export type PricingScenario = {
  id: "volume" | "balanced" | "margin";
  label: string;
  priceKrw: number;
  strategy: string;
  marginPct: number;
  netProfitKrw: number;
  estimatedDailyUnits: number;
  estimatedDailyProfitKrw: number;
  estimatedMonthlyProfitKrw: number;
};

export type RevenueForecast = {
  dailyProfitKrw: number;
  weeklyProfitKrw: number;
  monthlyProfitKrw: number;
  optimisticMonthlyKrw: number;
  conservativeMonthlyKrw: number;
  seasonalityNote: string;
};

export type ProfitPlaybookItem = {
  priority: number;
  action: string;
  expectedImpactKrw: number;
  timeframe: string;
  roi: "high" | "medium" | "low";
};

export type SellerAiV4Meta = {
  engineVersion: string;
  profitScore: number;
  recommendedScenarioId: PricingScenario["id"];
  keywordCluster?: string[];
  moatOpportunities?: string[];
};

export type PolicyFlag = {
  level: "info" | "warn" | "block";
  code: string;
  message: string;
};

/** 토스쇼핑 카탈로그·대표 아이템(쿠팡 Item Winner 유사) 분석 */
export type CatalogStrategyMode = "win_representative" | "avoid_catalog";

export type CatalogStrategyPlan = {
  /** win = 대표아이템(Item Winner) 선점 · avoid = 별도 카탈로그로 Item Winner 경쟁 회피 */
  mode: CatalogStrategyMode;
  rationale: string;
  recommendedTitle: string;
  /** avoid 모드: 카탈로그 분리·Item Winner 함정 회피 점수 0–99 */
  isolationScore?: number;
  actionSteps: string[];
  avoidItemWinnerTrap: boolean;
};

export type CatalogWinAnalysis = {
  representativeItemScore: number;
  catalogMatchRisk: "low" | "medium" | "high";
  estimatedCatalogSellers: number;
  ourTotalPriceKrw: number;
  bestCompetitorTotalKrw: number;
  priceGapKrw: number;
  winStrategy: string[];
  policyFlags: PolicyFlag[];
  complianceScore: number;
  policyBrief: string;
  catalogStrategy?: CatalogStrategyPlan;
};

export type SellerAiV6Meta = {
  engineVersion: string;
  v6MasterScore: number;
  catalogWin: CatalogWinAnalysis;
  catalogStrategy?: CatalogStrategyPlan;
  policyChecklist: string[];
  marketScanSummary?: string;
  riskPlaybook?: RiskPlaybookReport;
};

export type TossPolicyBrief = {
  engineVersion: string;
  catalogModel: string;
  representativeItemCriteria: string[];
  sellerObligations: string[];
  penaltyAvoidance: string[];
};

export type RiskCategory =
  | "catalog"
  | "shipping"
  | "penalty"
  | "prohibited"
  | "pricing"
  | "coupon"
  | "disclosure"
  | "certification"
  | "cs_returns"
  | "listing"
  | "commercial"
  | "import";

export type MarketplaceRisk = {
  category: RiskCategory;
  level: "info" | "warn" | "block" | "critical";
  code: string;
  title: string;
  message: string;
  penaltyPoints?: number;
  mitigation: string[];
};

export type PenaltyTierBrief = {
  windowDays: number;
  suspendThreshold: number;
  permanentAfterSuspensions: number;
  topViolations: { label: string; points: number }[];
};

export type RiskPlaybookReport = {
  engineVersion: string;
  overallSafetyScore: number;
  criticalCount: number;
  warnCount: number;
  blockCount: number;
  penaltyExposurePoints: number;
  risks: MarketplaceRisk[];
  mandatoryActions: string[];
  categoryCompliance: string[];
  playbookBrief: string;
  penaltyTier?: PenaltyTierBrief;
};

export type WholesaleListing = {
  platform: "domeggook" | "domeme" | "1688" | "taobao" | "rakuten" | "yahoo_jp";
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
};

export type ImportSourceListing = {
  platform: WholesaleListing["platform"];
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

export type ImportSourceBundle = {
  primaryCountry: "중국" | "일본";
  china: ImportSourceListing[];
  japan: ImportSourceListing[];
  bestMatch: ImportSourceListing | null;
  sourcingBrief: string;
};

export type GoalProgress = {
  goalKrw: number;
  projectedMonthlyKrw: number;
  gapKrw: number;
  progressPct: number;
  onTrack: boolean;
  actualMonthlyKrw?: number;
};

export type GoalPickContribution = {
  keyword: string;
  mode: "consignment" | "import";
  monthlyProfitKrw: number;
  goalSharePct: number;
  scalePotential: "high" | "medium" | "low";
  geniusScore: number;
  pathNote: string;
};

export type GoalMilestone = {
  week: number;
  label: string;
  targetCumulativeKrw: number;
  actions: string[];
};

export type TenMillionPlan = {
  goalKrw: number;
  progress: GoalProgress;
  requiredActiveSkus: number;
  recommendedMix: { consignment: number; import: number };
  milestones: GoalMilestone[];
  topContributors: GoalPickContribution[];
  geniusBrief: string;
  weeklyActions: string[];
  scalingLevers: string[];
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
  aiSummary?: string;
  competitorLandscape?: CompetitorLandscape;
  pricingScenarios?: PricingScenario[];
  revenueForecast?: RevenueForecast;
  profitPlaybook?: ProfitPlaybookItem[];
  profitScore?: number;
  estimatedMonthlyProfitKrw?: number;
  v4?: SellerAiV4Meta;
  wholesaleMatches?: WholesaleListing[];
  wholesaleBest?: WholesaleListing | null;
  wholesaleApiLive?: boolean;
  autoSourcingSteps?: string[];
  geniusScore?: number;
  goalSharePct?: number;
  goalPathNote?: string;
  v6MasterScore?: number;
  catalogWin?: CatalogWinAnalysis;
  catalogStrategy?: CatalogStrategyPlan;
  policyChecklist?: string[];
  riskPlaybook?: RiskPlaybookReport;
  v6?: SellerAiV6Meta;
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
  aiSummary?: string;
  competitorLandscape?: CompetitorLandscape;
  pricingScenarios?: PricingScenario[];
  revenueForecast?: RevenueForecast;
  profitPlaybook?: ProfitPlaybookItem[];
  profitScore?: number;
  v4?: SellerAiV4Meta;
  importSources?: ImportSourceBundle;
  importBest?: ImportSourceListing | null;
  sourcingBrief?: string;
  geniusScore?: number;
  goalSharePct?: number;
  goalPathNote?: string;
  v6MasterScore?: number;
  catalogWin?: CatalogWinAnalysis;
  catalogStrategy?: CatalogStrategyPlan;
  policyChecklist?: string[];
  riskPlaybook?: RiskPlaybookReport;
  v6?: SellerAiV6Meta;
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
