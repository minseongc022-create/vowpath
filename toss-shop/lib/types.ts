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
  /**
   * 이 수치가 어디서 나왔는가 — **판단의 무게가 달라지므로 반드시 구분한다**.
   *
   * · `catalog`   — 실제 카탈로그에서 매칭된 상품으로 계산했다. 근거로 쓸 수 있다.
   * · `synthetic` — 매칭 상품이 없어 키워드 해시로 채운 자리표시자다.
   *                 그럴듯한 숫자가 나오지만 **시장과 아무 관계가 없다**.
   *                 이걸 실측으로 착각하면 없는 수요에 광고비를 태우게 된다.
   *
   * 미지정(과거 데이터)은 알 수 없는 것으로 보고 보수적으로 다룬다.
   */
  basis?: "catalog" | "synthetic";
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
  /**
   * 효자상품 판정 — 실제 정산 입금액 기준 (예측 아님).
   * 광고·재고 배분의 근거가 되므로 사이클마다 갱신된다.
   */
  winners?: import("./seller-engine/winner-sku-engine").WinnerReport;
  /**
   * 반품지 등록 요청 — 토스가 반품지 생성 API를 열어두지 않아 사람이 해야 하는
   * 유일한 작업이다. 자비스는 막힌 공급처를 전부 떠넘기지 않고, 반복해서 걸리고
   * 실제로 돈이 되는 곳만 추려 올린다. 한 번 등록하면 그 공급처는 영구 자동화된다.
   */
  returnProvisioning?: {
    summary: string;
    /** 셀러센터에 그대로 옮겨 적을 수 있는 지시서 */
    instructions: string;
    asks: Array<{
      supplier: string;
      name: string;
      address: string;
      blockedCount: number;
    }>;
  };
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
  /** 자비스가 분류한 상품 카테고리 — 토스 카테고리 ID 자동 선택에 쓰인다 */
  category: TossShopCategory;
  supplierUrl?: string;
  /** 위탁: 도매 플랫폼 슬러그(domeggook/domeme/1688...) · 수입: 소싱 국가명 */
  supplierPlatform?: string;
  /** 도매꾹/도매매 공급사 ID — 공급처 단위 반품지 매핑 키 */
  supplierId?: string;
  /**
   * 공급처 반품 처리 방식 — 반품지 결정에 쓴다.
   * 공급처 수거형/미확인이면 전용 반품지가 없을 때 등록이 차단된다.
   */
  returnHandling?: import("./wholesale/supplier-return-policy").ReturnHandling;
  /** 공급사 표시명 — 반품지 매핑 누락 경고를 사람이 읽을 수 있게 */
  supplierName?: string;
  /**
   * 반품 물류 두뇌가 확정한 반품지 ID.
   *
   * 공급처 주소를 토스 등록 반품지와 대조해 자동으로 고른 값이다. 이게 들어오면
   * 사람이 매핑 JSON을 쓰지 않아도 공급처별 반품지가 맞게 걸린다.
   * 승인 화면에서 사람이 직접 지정하면 그쪽이 우선한다.
   */
  resolvedReturnLocationId?: number;
  /** 반품 안내 문구 — 확정된 반품 경로에서 나온 사실만 담긴다 */
  returnNote?: string;
};

export type JarvisListingDraft = {
  /** 토스 등록 규칙 검증 결과 — block이 있으면 자동 등록되지 않는다 */
  compliance?: import("./seller-engine/toss-policy-engine").ListingComplianceIssue[];
  /** 광고 손익분기 CPC (광고 판매분 수수료 0% 반영) */
  adEconomics?: import("./seller-engine/toss-growth-levers").AdEconomics;
  /** 장바구니 이탈 고객 쿠폰 설계 */
  cartCoupon?: import("./seller-engine/toss-growth-levers").CartCouponPlan;
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
  /**
   * 등록에 사용된 교환·반품지 결정 근거. 반품 사고는 등록 몇 주 뒤에
   * 터지므로 어떤 키로 어느 반품지가 뽑혔는지 사후 추적이 가능해야 한다.
   */
  returnLocation?: import("./api/exchange-return-location").ReturnLocationDecision;
  /** 등록에 사용된 카테고리 결정 근거 */
  category?: import("./api/category-resolver").CategoryDecision;
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
  /**
   * 공급처 반품·수거 안내 원문. 비어 있으면 반품 처리 주체를 판독할 수 없어
   * 반품지 결정이 fail-closed로 막힌다(전용 주소 또는 셀러 자체 주소 선언 필요).
   */
  policyText?: string;
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
  /** 몬테카를로 수익 확률 (1페이지 노출확률·월순익 분포) */
  profitProbability?: import("./seller-engine/profit-probability").SkuProbability;
  /** 제목·검색키워드 상위노출 최적화 */
  seo?: import("./seller-engine/toss-seo-engine").SeoAnalysis;
  /** 카탈로그 진입 전략 — 대장 회피(묶음 구성) vs 최저가 vs 소싱 거부 */
  catalogEntry?: import("./seller-engine/catalog-entry-strategy").CatalogEntryVerdict;
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
