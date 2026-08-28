import { CONSIGNMENT_DAILY_PICKS } from "../billing";
import type { CatalogProduct, ConsignmentPick, MarketKeywordMetrics } from "../types";
import {
  landedWholesaleUnitCost,
  searchWholesaleForConsignment,
  WHOLESALE_ENGINE_VERSION,
} from "../wholesale";
import { competitorsForProduct, estimateSupplierCost } from "./pricing";
import {
  assessRisks,
  analyzeCompetitorLandscape,
  buildActionSteps,
  buildAiSummary,
  buildKeywordIntel,
  enrichCompetitors,
  marketContext,
  pickBestProductForKeyword,
  rankKeywordsForSourcing,
  scoreOpportunity,
} from "./intelligence";
import { buildV4Enrichment, SELLER_AI_ENGINE_VERSION } from "./revenue-engine";
import { buildPickContributions, getMonthlyGoalKrw } from "./goal-engine";
import { buildV6PickEnrichment, POLICY_ENGINE_VERSION } from "./policy-engine";
import { scanMarket } from "./market-scanner";
import {
  assessIntegration,
  computeJarvisConfidence,
  filterJarvisCertifiedPicks,
} from "./jarvis-engine";
import { buildTopSellerPlaybook } from "./top-seller-playbook";
import { computeSkuProbability } from "./profit-probability";
import { sourcingMaxPerDay } from "./sourcing-plan";
import { decideCatalogEntry } from "./catalog-entry-strategy";
import { analyzeTitleSeo, buildSearchKeywords } from "./toss-seo-engine";
import { assessKeywordRelevance, buildRelevantTitle } from "./keyword-relevance";
import { netProfitPerUnitAfterAds, trueMarginPct } from "./price-floor";
import { netProfitPerUnit } from "./revenue-engine";
import { isDomeggookApiConfigured } from "../wholesale/domeggook-api";
import { meetsSupplierPolicy } from "../wholesale/supplier-quality";
import type { TossFeeContext } from "./fee-model";
import { checkPriceSanity, checkSupplierCostSanity } from "./price-sanity";

export type SourcingIntegrationContext = {
  tossApiConfigured: boolean;
  dataQuality: "live" | "mixed" | "demo";
};

/**
 * 제목은 관련성이 확인된 경우에만 키워드를 붙인다.
 *
 * 종전엔 무조건 `${keyword} ${productName}`을 만들었다. 상품 선택이 카테고리만
 * 맞으면 통과시키는 구조였기 때문에, 이 조합이 "무선이어폰 주방 세제" 같은
 * 제목을 실제로 만들어냈다. 이제 판정은 keyword-relevance.ts가 한다.
 */
function suggestedTitle(keyword: string, productName: string, supplierTitle?: string): string {
  return buildRelevantTitle({ keyword, productName, supplierTitle }).title;
}

function buildAutoSourcingSteps(
  keyword: string,
  wholesale: Awaited<ReturnType<typeof searchWholesaleForConsignment>>,
  priceKrw: number,
): string[] {
  const best = wholesale.bestMatch;
  const steps = [
    `토스쇼핑 「${keyword}」 키워드로 상품 등록 · AI 추천가 ${priceKrw.toLocaleString()}원`,
  ];
  if (best) {
    const platformLabel = best.platform === "domeggook" ? "도매꾹" : "도매매";
    steps.push(
      `${platformLabel} 공급처 확보: ${best.title.slice(0, 30)} · 공급가 ${landedWholesaleUnitCost(best).toLocaleString()}원 (${best.source === "live" ? "실시간 API" : "검색 링크"})`,
      `공급 URL 확인 → MOQ ${best.moq}개 · ${best.freeShipping ? "무료배송" : `배송 ${best.shippingFeeKrw.toLocaleString()}원`}`,
    );
  } else {
    steps.push(`도매꾹·도매매에서 「${keyword}」 검색 → 마진 12% 이상 공급처 선정`);
  }
  steps.push(
    "상품명·썸네일·상세: 토스 상위 3개 경쟁사 대비 차별화",
    "위탁 발주 → 출고 3일 이내 · 첫 2주 리뷰 10개 목표",
  );
  return steps;
}

function buildPick(
  dateKey: string,
  product: CatalogProduct,
  keyword: string,
  intel: ReturnType<typeof buildKeywordIntel>,
  v4: ReturnType<typeof buildV4Enrichment>,
  insights: ReturnType<typeof enrichCompetitors>,
  signals: ReturnType<typeof scoreOpportunity>["signals"],
  winScore: number,
  ctx: ReturnType<typeof marketContext>,
  aiSummary: string,
  competitorLandscape: ReturnType<typeof analyzeCompetitorLandscape>,
  wholesale: Awaited<ReturnType<typeof searchWholesaleForConsignment>>,
): ConsignmentPick {
  const highThreat = insights.filter((c) => c.threat === "high").length;
  const priceKrw = v4.optimal.priceKrw;
  const pricing = v4.pricing;

  return {
    id: `cs_${dateKey}_${product.id}`,
    keyword,
    productName: product.name,
    suggestedTitle: suggestedTitle(keyword, product.name, wholesale.bestMatch?.title),
    category: product.category,
    supplierCostKrw: pricing.supplierCostKrw,
    recommendedPriceKrw: priceKrw,
    competitorPrices: insights.slice(0, 6),
    competitorInsights: insights.slice(0, 8),
    searchVolume: intel.searchVolume,
    competitionIntensity: intel.competitionIntensity,
    estimatedMarginPct: pricing.marginPct,
    estimatedDailyProfitKrw: v4.optimal.estimatedDailyProfitKrw,
    estimatedDailyUnits: v4.dailyUnits,
    estimatedMonthlyProfitKrw: v4.optimal.estimatedMonthlyProfitKrw,
    confidenceScore: v4.profitScore,
    winScore,
    profitScore: v4.profitScore,
    reason: `${v4.optimal.label} · ${wholesale.bestMatch ? (wholesale.bestMatch.platform === "domeggook" ? "도매꾹" : "도매매") + " 연동" : "도매 추정"} · AI ${WHOLESALE_ENGINE_VERSION} 수익 ${v4.profitScore}`,
    pricing: { ...pricing, undercutKrw: priceKrw },
    pricingScenarios: v4.pricingScenarios,
    revenueForecast: v4.revenueForecast,
    profitPlaybook: v4.profitPlaybook,
    signals,
    actionSteps: buildActionSteps("consignment", {
      keyword,
      productName: product.name,
      priceKrw,
      supplierLabel: wholesale.bestMatch?.platform === "domeme" ? "도매매" : "도매꾹",
      supplierCost: pricing.supplierCostKrw,
    }),
    autoSourcingSteps: buildAutoSourcingSteps(keyword, wholesale, priceKrw),
    risks: assessRisks({
      marginPct: pricing.marginPct,
      competitionIntensity: intel.competitionIntensity,
      dataQuality: ctx.dataQuality,
      highThreatCompetitors: highThreat,
    }),
    aiSummary,
    competitorLandscape,
    wholesaleMatches: wholesale.listings,
    wholesaleBest: wholesale.bestMatch,
    wholesaleApiLive: wholesale.apiConfigured && wholesale.listings.some((l) => l.source === "live"),
    v4: { ...v4.v4, engineVersion: SELLER_AI_ENGINE_VERSION },
  };
}

export async function generateConsignmentPicks(
  catalog: CatalogProduct[],
  dateKey: string,
  marketKeywords?: Record<string, MarketKeywordMetrics>,
  integrationCtx?: SourcingIntegrationContext,
  /** 적응형 소싱 계획이 산출한 오늘 목표 개수 (없으면 기본값) */
  dailyTarget?: number,
): Promise<ConsignmentPick[]> {
  const ctx = marketContext(catalog, marketKeywords);
  const integration = assessIntegration({
    tossApiConfigured: integrationCtx?.tossApiConfigured ?? false,
    wholesaleApiConfigured: isDomeggookApiConfigured(),
    dataQuality: integrationCtx?.dataQuality ?? ctx.dataQuality,
    catalogSize: catalog.length,
  });
  const rankedKeywords = rankKeywordsForSourcing(catalog, marketKeywords, 60).filter(
    (k) => k.grade === "excellent" || k.grade === "good" || k.difficulty === "easy",
  );

  // 시장 스캐너로 순서를 다시 매긴다 (제외는 하지 않는다).
  //
  // 위 랭킹은 "사람들이 많이 찾는가"를 본다. 스캐너는 "신규 셀러가 뚫을 수 있는가"를
  // 본다 — 리뷰 3천 개짜리 상위권이 장악한 키워드는 검색량이 아무리 커도
  // 광고비만 태우고 끝나기 때문이다. enter 판정을 앞으로 당겨 하루치 등록
  // 슬롯이 이길 수 있는 싸움에 먼저 쓰이게 한다.
  //
  // ⚠️ 예전엔 skip 판정을 후보에서 완전히 제외했다. 하지만 스캐너의 임계값
  // (리뷰 장벽 500개, 대형셀러 장악도 70% 등)은 검증된 외부 기준이 아니라
  // 이 엔진 자체가 정한 값이다. 그 값 하나로 마진 좋은 상품을 통째로 못 올리게
  // 막으면, 하루 등록 개수가 스캐너의 추측만큼만 나온다. 그래서 이제는
  // **맨 뒤로 미룰 뿐 자르지 않는다** — 다른 확실한 후보가 부족하면 그때는
  // skip 판정 키워드도 최종 판단(certainty-gate)까지 가서 스스로 증명할 기회를 준다.
  const scan = scanMarket({
    keywords: rankedKeywords.map((k) => k.keyword),
    catalog,
    marketKeywords,
    limit: 60,
  });
  const scanRank = new Map<string, number>();
  scan.enter.forEach((s, i) => scanRank.set(s.keyword, i));
  scan.watch.forEach((s, i) => scanRank.set(s.keyword, 1000 + i));
  scan.skip.forEach((s, i) => scanRank.set(s.keyword, 2000 + i));

  const keywords = [...rankedKeywords].sort(
    // 스캐너 목록에 없는 키워드는 판정 근거가 부족했던 것이므로 enter와 watch
    // 사이(500)에 둔다 — 확실한 기회보다는 뒤, 확실한 함정보다는 앞.
    (a, b) => (scanRank.get(a.keyword) ?? 500) - (scanRank.get(b.keyword) ?? 500),
  );

  const candidates: ConsignmentPick[] = [];
  const usedProducts = new Set<string>();

  for (const kw of keywords) {
    // 적응형 목표가 최대 상한까지 올라갈 수 있으므로 후보 풀을 그만큼 확보한다
    if (candidates.length >= sourcingMaxPerDay() + 5) break;

    // ★ 카테고리 폴백을 제거했다 — 이게 무관한 제목의 근원이었다.
    //
    // 종전 폴백은 `catalog.find(p => p.category === kw.category)`로 카테고리
    // 안에서 **아무 상품이나** 집었다. 그리고 그 상품에 키워드를 앞에 붙여
    // 제목을 만들었기 때문에 "무선이어폰 주방 세제" 같은 조합이 나왔다.
    // 잘못된 키워드는 제목만 망치는 게 아니라 검색 키워드·광고 집행·상세
    // 문구까지 전부 오염시킨다(근거는 keyword-relevance.ts).
    //
    // 후보를 못 찾으면 **그 키워드를 건너뛴다.** 하루 목표를 채우려고 아무거나
    // 올리는 것보다 덜 올리는 게 낫다 — 확실성 게이트가 이미 같은 원칙으로 돈다.
    const product = pickBestProductForKeyword(kw.keyword, kw.category, catalog, marketKeywords);

    if (!product || usedProducts.has(product.id)) continue;

    // 뽑힌 상품이 정말 이 키워드의 상품인지 확인한다.
    // pickBestProductForKeyword는 카테고리만 맞아도 후보에 넣고 수요·마진으로
    // 정렬하므로, 관련성은 정렬에 반영되지 않는다. 여기서 걸러야 한다.
    const relevance = assessKeywordRelevance({
      keyword: kw.keyword,
      productName: product.name,
      supplierTitle: product.sourceListing?.title,
    });
    if (!relevance.relevant) continue;

    usedProducts.add(product.id);

    const intel = buildKeywordIntel(kw.keyword, catalog, marketKeywords);
    const competitors = competitorsForProduct(product, catalog);

    // ★ 발굴 표본은 자기 공급처를 이미 알고 있다 — 다시 찾지 않는다
    //
    // 종전엔 무조건 키워드로 도매를 다시 검색했다. 그런데 발굴로 만든
    // 표본의 제안가는 **그 표본을 만든 공급처의 원가**에서 계산된 값이다.
    // 재검색이 다른(대개 더 비싼) 공급처를 잡으면 제안가와 원가의 짝이
    // 어긋나고, 마진은 그 둘의 차이로 계산되므로 0에 가깝게 나온다.
    //
    // 실측: 모든 후보가 「마진 0.2% (15% 미만)」로 탈락했다. 그리고 저마진은
    // 리스크로 잡혀 안전점수를 72로 떨어뜨리고, 그게 다시 종합점수를 깎아
    // 인증을 막았다 — 한 번의 어긋남이 게이트 세 개를 동시에 닫고 있었다.
    // ★ 발굴 표본도 낱개 발주 여부를 확인하고 쓴다.
    //
    // ⚠️ 종전엔 `product.sourceListing`이 있으면 그대로 bestMatch로 썼다.
    // 그 경로는 pickBestWholesaleMatch를 거치지 않으므로 **낱개 발주 검증을
    // 통째로 건너뛴다.** 발굴은 시장을 넓게 훑어 표본을 만드는데, 그 표본에는
    // MOQ 10짜리 묶음 상품이 당연히 섞여 있다. 검증 없이 쓰면 그 묶음 단가가
    // 그대로 원가가 되어, 방금 고친 버그가 이 경로로 되살아난다.
    const sourceListing = product.sourceListing;
    const sourceListingSellsSingle =
      sourceListing != null &&
      (sourceListing.unitSourcing
        ? sourceListing.unitSourcing.available
        : sourceListing.source === "live" && sourceListing.moqVerified === true && sourceListing.moq <= 1);

    const wholesale = sourceListingSellsSingle
      ? {
          keyword: kw.keyword,
          listings: [sourceListing!],
          bestMatch: sourceListing!,
          searchedAt: new Date().toISOString(),
          apiConfigured: true,
        }
      : await searchWholesaleForConsignment({
          keyword: kw.keyword,
          tossAvgPriceKrw: intel.avgPriceKrw,
          targetRetailKrw: product.priceKrw,
        });

    // 낱개로 살 수 있는 공급처를 못 찾았으면 이 키워드는 건너뛴다.
    //
    // ⚠️ 종전엔 estimateSupplierCost(카테고리별 고정 배수 테이블)로 원가를
    // 지어내 계속 진행했다. 그건 import-sources가 "해시로 원가 생성"으로
    // 저지른 것과 같은 종류의 실수다 — 상품과 아무 관계 없는 숫자 위에
    // 마진·수익·확률이 전부 쌓인다. 확실성 게이트가 등록은 막아주지만,
    // 그때까지 하루치 소싱 슬롯과 화면의 수익 숫자를 오염시킨다.
    //
    // 위탁은 1개를 못 사면 성립하지 않는다. 못 사는 건 후보가 아니다.
    if (wholesale.bestMatch == null) continue;
    const supplierCost = landedWholesaleUnitCost(wholesale.bestMatch);

    // ★ 원가가 상식을 벗어나면 여기서 끊는다.
    //
    // 실측: 공급가가 묶음 전체 가격으로 들어와 판매가 2,700만원짜리 태블릿
    // 케이스가 만들어졌다. 마진 게이트는 이걸 못 잡는다 — 원가 900만원에
    // 판매가 2,700만원이면 마진 15%가 **수학적으로 성립**하기 때문이다.
    // 비율만 보는 게이트는 자릿수 오류를 통과시킨다.
    if (!checkSupplierCostSanity(supplierCost).sane) {
      continue;
    }

    // 배송 인센티브(판매수수료 0%)는 공급처가 실제로 1등급·당일발송일 때만
    // 약속할 수 있다. 미확인 공급처에 0%를 가정하면 마진이 부풀려지므로,
    // meetsSupplierPolicy가 통과한 live 공급처에 한해서만 적용한다.
    const feeCtx: TossFeeContext = {
      deliveryIncentiveEligible:
        wholesale.bestMatch?.source === "live" &&
        meetsSupplierPolicy(wholesale.bestMatch?.supplierQuality),
    };

    const pricingPreview = buildV4Enrichment({
      supplierCostKrw: supplierCost,
      competitors,
      intel,
      product,
      winScore: 50,
      landscapeDominance: "balanced",
      avgReviewCount: 0,
      mode: "consignment",
      feeCtx,
    });
    const insights = enrichCompetitors(product, catalog, pricingPreview.optimal.priceKrw);
    const landscape = analyzeCompetitorLandscape(insights, pricingPreview.pricing);

    const { score, signals } = scoreOpportunity({
      keyword: intel,
      marginPct: pricingPreview.pricing.marginPct,
      product,
      competitorCount: competitors.length,
      winPriceGap: pricingPreview.pricing.competitorLowKrw - pricingPreview.optimal.priceKrw,
      priceSpreadPct: landscape.priceSpreadPct,
      highThreatCompetitors: landscape.highThreatCount,
    });

    const v4 = buildV4Enrichment({
      supplierCostKrw: supplierCost,
      competitors,
      intel,
      product,
      winScore: score,
      landscapeDominance: landscape.dominance,
      avgReviewCount: landscape.avgReviewCount,
      mode: "consignment",
      feeCtx,
    });

    let aiSummary = buildAiSummary({
      mode: "consignment",
      keyword: kw.keyword,
      productName: product.name,
      winScore: score,
      intel,
      pricing: v4.pricing,
      landscape,
      dataQuality: ctx.dataQuality,
      monthlyProfitKrw: v4.optimal.estimatedMonthlyProfitKrw,
      profitScore: v4.profitScore,
      recommendedScenario: v4.optimal.label,
    });

    if (wholesale.bestMatch) {
      const pl = wholesale.bestMatch.platform === "domeggook" ? "도매꾹" : "도매매";
      aiSummary += ` ${pl} 공급가 ${landedWholesaleUnitCost(wholesale.bestMatch).toLocaleString()}원(${wholesale.bestMatch.source === "live" ? "실데이터" : "검색 기반"})로 위탁 등록 가능.`;
    }

    candidates.push(
      buildPick(
        dateKey,
        product,
        kw.keyword,
        intel,
        v4,
        insights,
        signals,
        score,
        ctx,
        aiSummary,
        landscape,
        wholesale,
      ),
    );
  }

  const enriched = candidates
    .map((pick) => {
      const contributions = buildPickContributions([
        {
          keyword: pick.keyword,
          mode: "consignment",
          monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
          searchVolume: pick.searchVolume,
          competitionIntensity: pick.competitionIntensity,
          marginPct: pick.estimatedMarginPct,
          category: pick.category,
        },
      ]);
      const c = contributions[0];
      const geniusScore = c?.geniusScore ?? pick.profitScore ?? 0;
      const competitorPrices =
        pick.competitorInsights?.map((x) => x.priceKrw) ??
        pick.competitorPrices.map((x) => x.priceKrw);
      const wholesaleBest = pick.wholesaleBest;
      const v6 = buildV6PickEnrichment({
        keyword: pick.keyword,
        productName: pick.productName,
        suggestedTitle: pick.suggestedTitle,
        category: pick.category,
        priceKrw: pick.recommendedPriceKrw,
        marginPct: pick.estimatedMarginPct,
        competitorPrices,
        competitionIntensity: pick.competitionIntensity,
        productCount: pick.competitorLandscape?.count ?? competitorPrices.length,
        reviewCount: pick.competitorLandscape?.avgReviewCount ?? 0,
        catalogSize: catalog.length,
        searchVolume: pick.searchVolume,
        priceLow: pick.pricing?.competitorLowKrw ?? pick.recommendedPriceKrw * 0.85,
        priceMedian: pick.pricing?.competitorMedianKrw ?? pick.recommendedPriceKrw,
        priceHigh: pick.pricing?.competitorHighKrw ?? pick.recommendedPriceKrw * 1.15,
        geniusScore,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        goalKrw: getMonthlyGoalKrw(),
        // 위탁 소싱에서는 **가격과 무관하게** 무료배송이 정답이다.
        //
        // landedWholesaleUnitCost가 입고 배송비를 이미 원가에 넣고,
        // 제안가는 그 원가에서 역산된다. 즉 무료배송 비용은 이미 값에
        // 반영돼 있어 추가로 나가는 돈이 없다. 게다가 토스 대표아이템은
        // **배송비 포함 총액** 최저가로 정해지므로 무료배송은 순이득이다.
        //
        // 종전의 `>= 15000`은 원가에 배송비가 안 들어간 일반 소매의
        // 감각을 그대로 가져온 것이라 우리 원가 구조와 맞지 않았다.
        // 그 결과 저가 상품은 가중치가 가장 큰 전술(14점)을 영원히
        // 못 받았고, 상위셀러 정렬이 78%에 닿지 못해 인증이 막혔다.
        freeShippingRecommended: wholesaleBest != null,
        mode: "consignment",
      });
      const topSellerPlaybook = buildTopSellerPlaybook({
        mode: "consignment",
        keyword: pick.keyword,
        category: pick.category,
        priceKrw: pick.recommendedPriceKrw,
        marginPct: pick.estimatedMarginPct,
        moq: wholesaleBest?.moq ?? 1,
        wholesalePlatform:
          wholesaleBest?.platform === "domeggook" || wholesaleBest?.platform === "domeme"
            ? wholesaleBest.platform
            : undefined,
        wholesaleLive: wholesaleBest?.source === "live",
        catalogStrategyMode: v6.catalogStrategy?.mode,
        representativeItemScore: v6.catalogWin.representativeItemScore,
        isolationScore: v6.catalogStrategy?.isolationScore,
        searchVolume: pick.searchVolume,
        competitionIntensity: pick.competitionIntensity,
        avgReviewCount: pick.competitorLandscape?.avgReviewCount,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        hasDifferentiatedTitle: pick.suggestedTitle !== pick.productName,
        // 위탁 소싱에서는 **가격과 무관하게** 무료배송이 정답이다.
        //
        // landedWholesaleUnitCost가 입고 배송비를 이미 원가에 넣고,
        // 제안가는 그 원가에서 역산된다. 즉 무료배송 비용은 이미 값에
        // 반영돼 있어 추가로 나가는 돈이 없다. 게다가 토스 대표아이템은
        // **배송비 포함 총액** 최저가로 정해지므로 무료배송은 순이득이다.
        //
        // 종전의 `>= 15000`은 원가에 배송비가 안 들어간 일반 소매의
        // 감각을 그대로 가져온 것이라 우리 원가 구조와 맞지 않았다.
        // 그 결과 저가 상품은 가중치가 가장 큰 전술(14점)을 영원히
        // 못 받았고, 상위셀러 정렬이 78%에 닿지 못해 인증이 막혔다.
        freeShippingRecommended: wholesaleBest != null,
      });
      const jarvis = computeJarvisConfidence({
        integration,
        v6MasterScore: v6.v6MasterScore,
        safetyScore: v6.riskPlaybook?.overallSafetyScore ?? 70,
        marginPct: pick.estimatedMarginPct,
        monthlyProfitKrw: pick.estimatedMonthlyProfitKrw ?? 0,
        moq: wholesaleBest?.moq ?? 1,
        wholesaleLive: wholesaleBest?.source === "live",
        wholesalePlatform:
          wholesaleBest?.platform === "domeggook" || wholesaleBest?.platform === "domeme"
            ? wholesaleBest.platform
            : undefined,
        criticalRisks: v6.riskPlaybook?.criticalCount ?? 0,
        blockRisks: v6.riskPlaybook?.blockCount ?? 0,
        representativeItemScore: v6.catalogWin.representativeItemScore,
        isolationScore: v6.catalogStrategy?.isolationScore,
        catalogStrategyMode: v6.catalogStrategy?.mode,
        competitionIntensity: pick.competitionIntensity,
        searchVolume: pick.searchVolume,
        topSellerAlignment: topSellerPlaybook.alignmentScore,
        // 마진율과 별개로 **개당 순이익 금액**을 본다. 율만 지키면 원가
        // 1,500원짜리도 통과하는데, 그건 개당 598원이라 아무리 많이 올려도
        // 목표에 못 닿는다.
        netProfitPerUnitKrw: netProfitPerUnit(pick.supplierCostKrw, pick.recommendedPriceKrw),
        supplierQuality: wholesaleBest?.supplierQuality,
        supplierPolicyApplies: wholesaleBest?.source === "live",
      });
      // 상위노출 최적화 — 제목/키워드가 노출확률을 좌우하고, 노출확률이 수익확률을 좌우한다
      const searchKeywords = buildSearchKeywords({
        mainKeyword: pick.keyword,
        productName: v6.recommendedTitle ?? pick.productName,
        category: pick.category,
      });
      const proposedTitle = v6.recommendedTitle ?? pick.productName;
      const seo = analyzeTitleSeo({
        title: proposedTitle,
        mainKeyword: pick.keyword,
        productName: pick.productName,
        category: pick.category,
        searchKeywords,
      });

      // ★ 진단만 하고 버리지 않는다 — 점수가 낮으면 최적화 제목을 실제로 쓴다.
      //
      // 종전엔 `seo.optimizedTitle`을 계산해 놓고 아무도 쓰지 않았다.
      // suggestedTitle은 v6.recommendedTitle 그대로였기 때문에, SEO 엔진이
      // "메인 키워드가 제목에 없음(-30점)"을 찾아내도 제목은 그대로 등록됐다.
      // 노출을 좌우하는 값을 계산만 하고 버리면 계산할 이유가 없다.
      //
      // 단, 최적화 제목도 관련성 검증을 통과해야 채택한다. optimizeTitle은
      // 메인 키워드를 무조건 맨 앞에 붙이므로, 키워드가 상품과 무관하면
      // 여기서 다시 "무선이어폰 주방 세제"가 만들어진다.
      const SEO_REWRITE_THRESHOLD = 70;
      const optimizedIsRelevant =
        seo.score < SEO_REWRITE_THRESHOLD &&
        assessKeywordRelevance({
          keyword: pick.keyword,
          productName: pick.productName,
          supplierTitle: wholesaleBest?.title,
        }).relevant;
      const finalTitle = optimizedIsRelevant ? seo.optimizedTitle : proposedTitle;

      // ★ 원가는 한 군데서만 온다 — pick.supplierCostKrw (landed cost).
      //
      // ⚠️ 종전엔 여기서 `wholesaleBest?.unitPriceKrw ?? 판매가 × 0.62`를 썼다.
      // 두 가지가 동시에 틀렸다:
      //
      //  1) unitPriceKrw는 **입고 배송비가 빠진** 값이다. 마진은 위쪽에서
      //     landedWholesaleUnitCost(배송비 포함)로 계산했으므로, 같은 픽 안에서
      //     원가가 두 개가 되고 화면마다 다른 마진이 표시된다.
      //  2) `× 0.62`는 상품과 아무 관계 없는 지어낸 배수다. import-sources.ts가
      //     "키워드 해시로 원가 생성"으로 저지른 것과 같은 종류의 실수이고,
      //     그 위에 진입 전략·수익 확률이 전부 쌓인다.
      const supplierCost = pick.supplierCostKrw;

      // 대장(대표 아이템)과 같은 카탈로그에 그대로 들어가면 노출이 막힌다.
      // 최저가 경쟁 / 묶음 구성 / 소싱 거부 중 하루 기대순익이 가장 큰 길을 고른다.
      // 대장가는 **관측된 경쟁가일 때만** 진짜다. 경쟁 상품을 못 찾으면
      // 우리 제안가에서 역산한 값이 들어가는데, 그걸로 최저가 경쟁을 계산하면
      // 우리 가격을 우리가 깎아 항상 마진 하한 아래가 된다.
      const observedIncumbent = pick.competitorInsights?.[0]?.priceKrw;
      const incumbentPrice = observedIncumbent ?? Math.round(pick.recommendedPriceKrw * 0.97);
      const catalogEntry = decideCatalogEntry({
        incumbentIsReal: observedIncumbent != null,
        supplierUnitKrw: supplierCost,
        // supplierCost가 이미 landed(입고 배송비 포함)이므로 배송비를 또 더하면
        // 이중 계상이 된다. 여기서는 0으로 넘긴다.
        supplierShippingKrw: 0,
        incumbentPriceKrw: incumbentPrice,
        incumbentShippingKrw: 0,
        baselineDailyUnits: Math.max(0.3, pick.estimatedDailyUnits ?? 1),
      });

      // 진입 전략이 정한 가격/구성을 실제 등록가로 채택한다
      const entryPrice = catalogEntry.sourceable ? catalogEntry.best.priceKrw : pick.recommendedPriceKrw;
      // 수익 확률 시뮬레이션에 넣는 단위 순익도 **광고비를 뺀 값**이어야 한다.
      // 광고를 켤 계획으로 확률을 뽑으면서 광고비를 안 빼면, 나오는 월 순익
      // 분포가 통째로 낙관 쪽으로 밀린다.
      // 묶음이면 진입 전략이 계산한 묶음 순익을 쓴다 (낱개 원가로 재면 부풀려진다)
      const unitNet = catalogEntry.sourceable
        ? catalogEntry.best.netProfitKrw
        : netProfitPerUnitAfterAds({
            supplierCostKrw: supplierCost,
            priceKrw: entryPrice,
            feeCtx: {
              deliveryIncentiveEligible:
                wholesaleBest?.source === "live" &&
                meetsSupplierPolicy(wholesaleBest?.supplierQuality),
            },
          });

      // ★ 묶음이면 원가도 묶음 기준이어야 한다.
      //
      // ⚠️ entryPrice가 2입·3입 묶음가일 때 **낱개 원가**로 마진을 재면
      // 마진이 묶음 수량만큼 부풀려진다. 실제로 관측된 값: 2입 묶음가
      // 45,370원(= 15% 마진 하한)인데 낱개 원가 14,857원으로 재서 47.8%로
      // 표시됐다 — 실제는 15%다.
      //
      // 진입 전략은 이미 묶음 원가(단가×수량 + 배송비 1건분)로 순익·마진을
      // 정확히 계산해 두었다. 다시 계산하지 않고 그 값을 쓴다 — 같은 것을
      // 두 곳에서 계산하면 언젠가 어긋난다.
      //
      // ★ 가격이 바뀌었으면 마진도 다시 계산한다.
      //
      // ⚠️ 종전엔 `recommendedPriceKrw`만 entryPrice로 갈아끼우고
      // `estimatedMarginPct`는 옛 가격(v4.optimal.priceKrw) 기준 값을 그대로
      // 두었다. 그래서 **화면에 뜨는 마진이 실제 등록가의 마진이 아니었고**,
      // 확실성 게이트(MIN_MARGIN_PCT 15%)도 그 옛 값을 검사하고 있었다.
      // 즉 게이트가 통과시킨 마진과 실제로 팔릴 가격의 마진이 서로 다른 숫자였다.
      //
      // 여기서는 광고비·반품충당까지 뺀 **실마진**으로 다시 잰다. 광고를 켤
      // 상품인데 광고비를 안 뺀 마진으로 게이트를 통과시키면, 광고를 켜는
      // 순간 적자가 되기 때문이다 (price-floor.ts 참조).
      const entryMarginPct = catalogEntry.sourceable
        ? catalogEntry.best.marginPct
        : trueMarginPct({
            supplierCostKrw: supplierCost,
            priceKrw: entryPrice,
            feeCtx: {
              deliveryIncentiveEligible:
                wholesaleBest?.source === "live" &&
                meetsSupplierPolicy(wholesaleBest?.supplierQuality),
            },
          });
      const competitorLow = pick.competitorInsights?.[0]?.priceKrw ?? 0;
      const profitProbability = computeSkuProbability({
        seedKey: `${pick.id}:${pick.keyword}`,
        keyword: pick.keyword,
        category: pick.category,
        baselineDailyUnits: Math.max(0.3, pick.estimatedDailyUnits ?? 1),
        netProfitPerUnitKrw: unitNet,
        competitionIntensity: pick.competitionIntensity,
        searchVolume: pick.searchVolume,
        dataQuality: ctx.dataQuality,
        competitorAvgReviews: pick.competitorLandscape?.avgReviewCount,
        seoScore: seo.score,
        priceRatioVsLow: competitorLow > 0 ? entryPrice / competitorLow : undefined,
      });

      return {
        ...pick,
        profitProbability,
        catalogEntry,
        recommendedPriceKrw: entryPrice,
        // 등록가와 짝이 맞는 마진 — 게이트도 화면도 같은 숫자를 본다
        estimatedMarginPct: entryMarginPct,
        supplierCostKrw: supplierCost,
        seo,
        suggestedTitle: finalTitle,
        geniusScore,
        goalSharePct: c?.goalSharePct,
        goalPathNote: c?.pathNote,
        v6MasterScore: v6.v6MasterScore,
        catalogWin: v6.catalogWin,
        catalogStrategy: v6.catalogStrategy,
        policyChecklist: v6.policyChecklist,
        riskPlaybook: v6.riskPlaybook,
        topSellerPlaybook,
        jarvis,
        actionSteps: [
          ...topSellerPlaybook.jarvisActions.slice(0, 2),
          ...(v6.catalogStrategy?.actionSteps ?? []),
          ...(v6.riskPlaybook?.mandatoryActions.slice(0, 2) ?? []),
          ...(pick.actionSteps ?? []).slice(0, 1),
        ],
        v6: {
          engineVersion: POLICY_ENGINE_VERSION,
          v6MasterScore: v6.v6MasterScore,
          catalogWin: v6.catalogWin,
          catalogStrategy: v6.catalogStrategy,
          policyChecklist: v6.policyChecklist,
          marketScanSummary: v6.marketScanSummary,
          riskPlaybook: v6.riskPlaybook,
        },
        confidenceScore: jarvis.certified ? jarvis.confidencePct : v6.v6MasterScore,
        reason: `${jarvis.jackpotCertified ? "🎯 Jarvis 대박" : jarvis.certified ? "✓ Jarvis 93%+" : "Jarvis"} · ${pick.reason}`,
        aiSummary:
          pick.aiSummary +
          ` ${jarvis.brief}` +
          ` ${topSellerPlaybook.brief}` +
          ` ${v6.catalogStrategy?.rationale ?? ""}` +
          (c ? ` · ${jarvis.monthlyPathNote}` : ""),
      };
    })
    .sort((a, b) => {
      const certA = a.jarvis?.certified ? 1 : 0;
      const certB = b.jarvis?.certified ? 1 : 0;
      if (certA !== certB) return certB - certA;
      const jackA = a.jarvis?.jackpotCertified ? 1 : 0;
      const jackB = b.jarvis?.jackpotCertified ? 1 : 0;
      if (jackA !== jackB) return jackB - jackA;
      // 동급이면 "실제로 돈이 될 기대값" 순 — 확률×금액이 곧 수익이다
      const expA = a.profitProbability?.expectedKrw ?? 0;
      const expB = b.profitProbability?.expectedKrw ?? 0;
      if (expA !== expB) return expB - expA;
      return (b.jarvis?.confidencePct ?? 0) - (a.jarvis?.confidencePct ?? 0);
    });

  // 진입 전략이 "거부"로 판정한 픽은 소싱하지 않는다.
  // 대장을 이길 수도, 묶음으로 빠져나갈 수도 없는 상품은 올려봐야 노출이 안 되고
  // 재고·CS·페널티 리스크만 남는다. (계산만 하고 거르지 않으면 무의미하다)
  const sourceable = enriched.filter((p) => {
    if (p.catalogEntry?.sourceable === false) return false;

    // ★ 마지막 관문 — 최종 등록가가 상식적인 숫자인가.
    //
    // 진입 전략이 묶음가를 정하면서 가격이 다시 커질 수 있으므로, 원가
    // 검사(위쪽)와 별개로 **실제 등록될 가격**을 한 번 더 본다.
    // 마진율이 아무리 좋아도 태블릿 케이스가 2,700만원일 수는 없다.
    return checkPriceSanity({
      priceKrw: p.recommendedPriceKrw,
      supplierCostKrw: p.supplierCostKrw,
    }).sane;
  });

  const ranked = integration.readyFor90
    ? filterJarvisCertifiedPicks(sourceable, { onlyCertified: true }).length >= 2
      ? filterJarvisCertifiedPicks(sourceable, { onlyCertified: true })
      : sourceable
    : sourceable;

  const target = Math.max(1, Math.min(sourcingMaxPerDay(), dailyTarget ?? CONSIGNMENT_DAILY_PICKS));
  return ranked.slice(0, target);
}

export { SELLER_AI_ENGINE_VERSION, WHOLESALE_ENGINE_VERSION };
