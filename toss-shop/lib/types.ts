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
  ruleId?: string;
  competitorId?: string;
  watchlistId?: string;
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
  /** Jarvis listing drafts awaiting user OK before publish. */
  listingDrafts?: JarvisListingDraft[];
  /** Autopilot fulfillment queue — Toss order → wholesale → tracking */
  fulfillmentJobs?: JarvisFulfillmentJob[];
  /** Last Jarvis autopilot cycle report */
  lastAutopilotReport?: JarvisAutopilotReport;
};

export type JarvisListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "publishing"
  | "published"
  | "rejected"
  | "failed";

export type JarvisDetailPageSource =
  | "jarvis_ai"
  | "matchcut_pending"
  | "matchcut"
  | "openai_premium"
  | "hookable_api"
  | "draph"
  | "sellerbiseo";

export type JarvisDetailPageBundle = {
  source: JarvisDetailPageSource;
  html: string;
  thumbnailUrl?: string;
  sellingPoints: string[];
  searchKeywords: string[];
  matchcutReady: boolean;
  matchcutNote?: string;
  imageUrls?: string[];
  detailProvider?: string;
  detailCostKrw?: number;
};

export type JarvisPickBrief = {
  version: string;
  headline: string;
  whyReasons: string[];
  appliedTactics: string[];
  profitDailyKrw: number;
  profitMonthlyKrw: number;
  profitOptimisticKrw: number;
  profitConservativeKrw: number;
  marginPct: number;
  goalSharePct: number;
  confidencePct: number;
  certified: boolean;
  jarvisBrief?: string;
  gateHighlights: Array<{ label: string; passed: boolean; detail: string }>;
  mode: "consignment" | "import";
  keyword: string;
  productName: string;
  recommendedPriceKrw: number;
};

export type JarvisConsignmentOrderStatus =
  | "pending"
  | "ready"
  | "ordered"
  | "simulated"
  | "failed"
  | "skipped";

export type JarvisConsignmentOrder = {
  status: JarvisConsignmentOrderStatus;
  platform?: string;
  supplierUrl?: string;
  itemNo?: number;
  unitPriceKrw?: number;
  moq?: number;
  orderNote?: string;
  autoOrderSupported?: boolean;
  orderedAt?: string;
};

export type JarvisAdCampaignPlan = {
  engineVersion: string;
  keyword: string;
  primaryKeywords: string[];
  longTailKeywords: string[];
  dailyBudgetKrw: number;
  estimatedCpcKrw: number;
  estimatedDailyClicks: number;
  rankTargetScore: number;
  pageOneGoal: string;
  itemWinnerAvoidance: boolean;
  tactics: string[];
  brief: string;
  autoExecuteReady: boolean;
};

export type JarvisWholesaleComposition = {
  engineVersion: string;
  platform: string;
  title: string;
  unitPriceKrw: number;
  moq: number;
  compositionTags: string[];
  differentiationSuffix?: string;
  recommendedTitle: string;
  catalogMode: "win_representative" | "avoid_catalog";
  isolationScore: number;
  itemWinnerRisk: "low" | "medium" | "high";
  risks: Array<{ code: string; level: string; message: string; mitigation: string }>;
  brief: string;
  listingReady: boolean;
};

export type JarvisFulfillmentStatus =
  | "detected"
  | "toss_preparing"
  | "wholesale_ready"
  | "wholesale_ordered"
  | "tracking_registered"
  | "cancelled";

export type JarvisFulfillmentJob = {
  id: string;
  merchantId: string;
  orderId: number;
  orderProductId: number;
  productName: string;
  status: JarvisFulfillmentStatus;
  tossOrderStatus?: string;
  customer: { name: string; phone: string; address: string; zipCode: string };
  quantity: number;
  wholesalePlatform?: string;
  supplierUrl?: string;
  itemNo?: number;
  domemeOrderNote?: string;
  pendingTrackingNumber?: string;
  pendingDeliveryCompany?: string;
  trackingNumber?: string;
  deliveryCompany?: string;
  wholesalePreparedAt?: string;
  wholesaleOrderedAt?: string;
  trackingRegisteredAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type JarvisAutopilotReport = {
  engineVersion: string;
  ranAt: string;
  enabled: boolean;
  autoExecute: boolean;
  actions: string[];
  errors: string[];
  stats: {
    certifiedSkus: number;
    draftsCreated: number;
    draftsExecuted: number;
    pendingReview: number;
    published: number;
    fulfillmentActive: number;
    fulfillmentNew: number;
  };
  brief: string;
  nextSteps: string[];
};

export type JarvisHealthCheckCategory =
  | "intelligence"
  | "listing"
  | "sourcing"
  | "ads"
  | "fulfillment"
  | "autopilot";

export type JarvisHealthReport = {
  engineVersion: string;
  checkedAt: string;
  score: number;
  passed: number;
  total: number;
  readyForProduction: boolean;
  checks: Array<{
    id: string;
    label: string;
    category: JarvisHealthCheckCategory;
    passed: boolean;
    detail: string;
  }>;
  failedIds: string[];
  summary: string;
  chatPromises: Array<{ topic: string; status: "ok" | "partial" | "needs_api" }>;
};

export type JarvisListingPayload = {
  name: string;
  brandName: string;
  salePrice: number;
  originPrice: number;
  searchKeywords: string[];
  description: string;
  categoryHint: string;
  deliveryFeeType: "FREE" | "PAID" | "CONDITIONALLY_FREE";
  supplierUrl?: string;
  supplierPlatform?: string;
};

export type JarvisListingDraft = {
  id: string;
  merchantId: string;
  pickId: string;
  pickMode: "consignment" | "import";
  keyword: string;
  status: JarvisListingStatus;
  jarvisConfidence?: number;
  jarvisCertified?: boolean;
  detailPage: JarvisDetailPageBundle;
  listingPayload: JarvisListingPayload;
  pickBrief?: JarvisPickBrief;
  sellerChecklist: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  publishedAt?: string;
  executedAt?: string;
  tossProductId?: number;
  publishError?: string;
  rejectionReason?: string;
  consignmentOrder?: JarvisConsignmentOrder;
  adCampaign?: JarvisAdCampaignPlan;
  wholesaleComposition?: JarvisWholesaleComposition;
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

export type IntegrationStatus = {
  score: number;
  tossApi: boolean;
  wholesaleApi: boolean;
  liveCatalog: boolean;
  domemePreferred: boolean;
  readyFor90: boolean;
  missing: string[];
};

export type JarvisGateResult = {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  detail: string;
};

export type JarvisConfidenceReport = {
  jarvisVersion: string;
  confidencePct: number;
  jackpotPct: number;
  certified: boolean;
  jackpotCertified: boolean;
  integration: IntegrationStatus;
  gates: JarvisGateResult[];
  brief: string;
  monthlyPathNote: string;
  topSellerAlignment?: number;
};

export type AppliedTactic = {
  id: string;
  title: string;
  applied: boolean;
  action: string;
  source: string;
};

export type TopSellerPlaybookReport = {
  engineVersion: string;
  alignmentScore: number;
  verifiedTacticCount: number;
  appliedCount: number;
  tactics: AppliedTactic[];
  jarvisActions: string[];
  brief: string;
};

export type WholesaleListing = {
  platform: "domeggook" | "domeme" | "1688" | "taobao" | "rakuten" | "yahoo_jp";
  /** 공급사 등급·출고속도 (live 응답에서 판독; 미확인이면 verified:false → Jarvis 게이트 탈락) */
  supplierQuality?: import("./wholesale/supplier-quality").SupplierQuality;
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
  jarvis?: JarvisConfidenceReport;
  topSellerPlaybook?: TopSellerPlaybookReport;
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
  jarvis?: JarvisConfidenceReport;
  topSellerPlaybook?: TopSellerPlaybookReport;
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
