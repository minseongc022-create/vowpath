import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSettlementCsv } from "../../toss-shop/lib/settlement-csv.ts";
import { mapApiProductsToCatalog, reconcileImportedSettlements } from "../../toss-shop/lib/api/mappers.ts";

test("parseSettlementCsv parses English headers", () => {
  const csv = `order_id,order_date,product_name,gross_krw,platform_fee_krw,shipping_fee_krw
TS-001,2026-08-15,테스트상품,10000,800,0`;
  const rows = parseSettlementCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].orderId, "TS-001");
  assert.equal(rows[0].grossKrw, 10000);
  assert.equal(rows[0].expectedPayoutKrw, 9200);
});

test("mapApiProductsToCatalog assigns ranks", () => {
  const catalog = mapApiProductsToCatalog(
    [
      { id: 100, name: "A", salePrice: 5000 },
      { id: 200, name: "B", salePrice: 10000 },
    ],
    "내 상점",
  );
  assert.equal(catalog[0].id, "200");
  assert.equal(catalog[0].rank, 1);
  assert.equal(catalog[0].sellerName, "내 상점");
});

test("collectMarketIntelligence builds keyword metrics from catalog", async () => {
  const { collectMarketIntelligence } = await import("../../toss-shop/lib/market-collector/index.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");
  const result = collectMarketIntelligence(SEED_CATALOG);
  assert.ok(Object.keys(result.marketKeywords).length > 0);
  const tomato = result.marketKeywords["방울토마토"] ?? result.marketKeywords["토마토"];
  assert.ok(tomato);
  assert.ok(tomato.searchVolume > 0);
});

test("getPlanAccess grants owner unlimited", async () => {
  const { getPlanAccess } = await import("../../toss-shop/lib/billing.ts");
  const access = getPlanAccess({
    email: "minseongc022@gmail.com",
    plan: "owner",
  });
  assert.equal(access.fullAccess, true);
  assert.equal(access.isOwner, true);
});

test("getPlanAccess grants pro on active subscription", async () => {
  const { getPlanAccess } = await import("../../toss-shop/lib/billing.ts");
  const access = getPlanAccess({
    email: "user@example.com",
    plan: "pro",
    subscriptionStatus: "active",
  });
  assert.equal(access.fullAccess, true);
  assert.equal(access.tier, "pro");
});

test("E2E: consignment pick -> listing draft -> execute (mock Toss API, no real network/secrets)", async (t) => {
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { buildListingDraftFromPick } = await import("../../toss-shop/lib/seller-engine/listing-automation.ts");
  const { executeConsignmentOrder } = await import("../../toss-shop/lib/seller-engine/consignment-order.ts");
  const { publishListingToToss } = await import("../../toss-shop/lib/api/create-product.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");

  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-23");
  assert.ok(picks.length > 0, "expected at least one consignment pick from seed catalog");
  const pick = picks[0];

  const draft = await buildListingDraftFromPick({
    merchantId: "merchant_test",
    pick,
    mode: "consignment",
    draftId: "draft_test_1",
    now: "2026-08-23T00:00:00.000Z",
  });

  assert.equal(draft.pickMode, "consignment");
  assert.ok(draft.listingPayload.name.length > 0);
  assert.ok(draft.listingPayload.salePrice > 0);

  // Stand in for the real Toss FEP (OAuth token + product create) without any
  // network access or real credentials, so the execute step can be exercised
  // end to end offline.
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "mock_token", expires_in: 3600 }), {
        status: 200,
      });
    }
    return new Response(
      JSON.stringify({ resultType: "SUCCESS", success: { id: 999888 } }),
      { status: 200 },
    );
  };

  const publishResult = await publishListingToToss({
    merchantId: "merchant_test",
    config: { accessKey: "mock_key", secretKey: "mock_secret", sandbox: true, partnerName: "effiroad" },
    draft,
    categoryId: 12345,
    exchangeReturnLocationId: 6789,
  });

  assert.equal(publishResult.ok, true);
  assert.equal(publishResult.productId, 999888);

  //위탁 발주는 토스 API와 무관하게 도매매/도매꾹 URL 기록으로 처리된다 (§5 한계: 자동 발주 API 없음).
  const order = await executeConsignmentOrder(draft, pick);
  assert.ok(["ordered", "failed"].includes(order.status));
  if (order.status === "ordered") {
    assert.ok(order.orderNote.length > 0);
    assert.ok(order.orderedAt);
  } else {
    assert.equal(order.orderNote, "공급처 정보 없음 — 위탁 발주 불가");
  }
});

test("jarvis config limits clamp env values", async () => {
  const { getAutopilotMaxDraftsPerCycle, getAutoExecuteMaxPerCycle } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-config.ts"
  );
  process.env.JARVIS_AUTOPILOT_MAX_DRAFTS = "99";
  process.env.JARVIS_AUTO_EXECUTE_MAX = "0";
  assert.equal(getAutopilotMaxDraftsPerCycle(), 10);
  assert.equal(getAutoExecuteMaxPerCycle(), 1);
  delete process.env.JARVIS_AUTOPILOT_MAX_DRAFTS;
  delete process.env.JARVIS_AUTO_EXECUTE_MAX;
  assert.equal(getAutopilotMaxDraftsPerCycle(), 3);
});

test("runTossDeepAnalysis returns opportunity metrics", async () => {
  const { runTossDeepAnalysis } = await import("../../toss-shop/lib/seller-engine/toss-market-engine.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");
  const deep = await runTossDeepAnalysis({ keyword: "방울토마토", catalog: SEED_CATALOG });
  assert.equal(deep.keyword, "방울토마토");
  assert.ok(deep.opportunityScore >= 0 && deep.opportunityScore <= 100);
  assert.ok(deep.serp.topProducts.length > 0);
});

test("reconcileImportedSettlements merges by orderId", () => {
  const existing = [
    {
      id: "stl_1",
      orderId: "TS-1",
      orderDate: "2026-08-01",
      productName: "X",
      grossKrw: 1000,
      platformFeeKrw: 80,
      shippingFeeKrw: 0,
      expectedPayoutKrw: 920,
      status: "pending",
    },
  ];
  const merged = reconcileImportedSettlements(
    existing,
    [{ orderId: "TS-1", orderDate: "2026-08-01", productName: "X", grossKrw: 1000, platformFeeKrw: 80, shippingFeeKrw: 0, expectedPayoutKrw: 920, payoutDate: "2026-08-05" }],
    (p) => `${p}_new`,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "matched");
});

test("supplier policy: fail-closed when grade/ship speed unreadable", async () => {
  const { readSupplierQuality, meetsSupplierPolicy } = await import(
    "../../toss-shop/lib/wholesale/supplier-quality.ts"
  );
  // 등급·출고 필드가 전혀 없는 응답 → 추측 통과 금지
  const q = readSupplierQuality({ no: 1, title: "상품", price: 1000 });
  assert.equal(q.verified, false);
  assert.equal(q.grade, "unknown");
  assert.equal(meetsSupplierPolicy(q), false);
  assert.equal(meetsSupplierPolicy(undefined), false);
});

test("supplier policy: only 1등급 + 당일발송 passes", async () => {
  const { readSupplierQuality, meetsSupplierPolicy } = await import(
    "../../toss-shop/lib/wholesale/supplier-quality.ts"
  );
  const pass = readSupplierQuality({ grade: "우수", todayShip: "Y" });
  assert.equal(pass.verified, true);
  assert.equal(pass.grade, "excellent");
  assert.equal(pass.shipSpeed, "same_day");
  assert.equal(meetsSupplierPolicy(pass), true);

  // 등급은 우수지만 익일발송 → 탈락
  const slowShip = readSupplierQuality({ grade: "우수", avgShipDays: 1 });
  assert.equal(slowShip.shipSpeed, "next_day");
  assert.equal(meetsSupplierPolicy(slowShip), false);

  // 당일발송이지만 일반등급 → 탈락
  const lowGrade = readSupplierQuality({ grade: "일반", todayShip: "Y" });
  assert.equal(lowGrade.grade, "normal");
  assert.equal(meetsSupplierPolicy(lowGrade), false);

  // 정상 출고율 80% 미만 → 탈락
  const lowRate = readSupplierQuality({ grade: "우수", todayShip: "Y", shipRate: "72" });
  assert.equal(lowRate.fulfillmentRatePct, 72);
  assert.equal(meetsSupplierPolicy(lowRate), false);
});

test("jarvis gate rejects picks whose live supplier is not 1등급+당일발송", async () => {
  const { computeJarvisConfidence, assessIntegration } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-engine.ts"
  );
  const { readSupplierQuality } = await import("../../toss-shop/lib/wholesale/supplier-quality.ts");

  const base = {
    integration: assessIntegration({
      tossApiConfigured: true,
      wholesaleApiConfigured: true,
      dataQuality: "live",
      catalogSize: 50,
    }),
    v6MasterScore: 95,
    safetyScore: 95,
    marginPct: 30,
    monthlyProfitKrw: 900000,
    moq: 1,
    wholesaleLive: true,
    wholesalePlatform: "domeme",
    criticalRisks: 0,
    blockRisks: 0,
    competitionIntensity: 30,
    searchVolume: 5000,
    topSellerAlignment: 90,
  };

  const bad = computeJarvisConfidence({
    ...base,
    supplierQuality: readSupplierQuality({ title: "정보없음" }),
  });
  const badGate = bad.gates.find((g) => g.id === "supplier_grade");
  assert.ok(badGate, "supplier_grade gate should exist");
  assert.equal(badGate.passed, false);

  const good = computeJarvisConfidence({
    ...base,
    supplierQuality: readSupplierQuality({ grade: "우수", todayShip: "Y", shipRate: 97 }),
  });
  const goodGate = good.gates.find((g) => g.id === "supplier_grade");
  assert.equal(goodGate.passed, true);
  assert.ok(good.confidencePct > bad.confidencePct);
});

test("profit probability: page1 exposure drives revenue, deterministic", async () => {
  const { computeSkuProbability, estimatePage1Probability } = await import(
    "../../toss-shop/lib/seller-engine/profit-probability.ts"
  );
  // 경쟁 심하고 경쟁사 리뷰 많으면 신규 리스팅 노출 확률이 낮아야 한다
  const hard = estimatePage1Probability({ competitionIntensity: 2.5, competitorAvgReviews: 5000, seoScore: 40 });
  const easy = estimatePage1Probability({ competitionIntensity: 0.5, competitorAvgReviews: 20, seoScore: 90 });
  assert.ok(hard < easy, "경쟁 심할수록 노출확률 낮아야");
  assert.ok(hard >= 0.03 && easy <= 0.95);

  const base = {
    seedKey: "t1", keyword: "테스트", category: "food",
    baselineDailyUnits: 3, netProfitPerUnitKrw: 5000,
    competitionIntensity: 1.2, searchVolume: 4000, dataQuality: "live",
  };
  const a = computeSkuProbability(base);
  const b = computeSkuProbability(base);
  assert.equal(a.expectedKrw, b.expectedKrw, "같은 입력이면 같은 확률(결정적)");
  assert.ok(a.p10Krw <= a.p50Krw && a.p50Krw <= a.p90Krw, "분위수 순서");
});

test("profit probability: demo data is marked untrustworthy", async () => {
  const { computePortfolioGoal } = await import("../../toss-shop/lib/seller-engine/profit-probability.ts");
  const skus = Array.from({ length: 10 }, (_, i) => ({
    seedKey: `s${i}`, baselineDailyUnits: 3, netProfitPerUnitKrw: 6000,
    competitionIntensity: 1.0, competitorAvgReviews: 100, seoScore: 80,
  }));
  const demo = computePortfolioGoal({ skus, dataQuality: "demo", goalKrw: 10_000_000 });
  assert.equal(demo.trustworthy, false, "demo 확률은 근거로 쓸 수 없어야");
  assert.match(demo.gap.note, /근거로 쓸 수 없음/);

  const live = computePortfolioGoal({ skus, dataQuality: "live", goalKrw: 10_000_000 });
  assert.equal(live.trustworthy, true);
  assert.ok(live.goalProbPct >= 0 && live.goalProbPct <= 100);
});

test("portfolio goal: more SKUs raise achievement probability", async () => {
  const { computePortfolioGoal } = await import("../../toss-shop/lib/seller-engine/profit-probability.ts");
  const mk = (n) => Array.from({ length: n }, (_, i) => ({
    seedKey: `p${i}`, baselineDailyUnits: 3, netProfitPerUnitKrw: 5800,
    competitionIntensity: 0.8, competitorAvgReviews: 50, seoScore: 85,
  }));
  const few = computePortfolioGoal({ skus: mk(15), dataQuality: "live", goalKrw: 10_000_000 });
  const many = computePortfolioGoal({ skus: mk(90), dataQuality: "live", goalKrw: 10_000_000 });
  assert.ok(many.goalProbPct > few.goalProbPct, "SKU 늘면 달성확률 올라야");
  assert.ok(few.gap.moreSkusNeeded > 0, "미달이면 몇 개 더 필요한지 역산해야");
});

test("toss SEO: banned phrases and keyword placement are enforced", async () => {
  const { analyzeTitleSeo, buildSearchKeywords, optimizeTitle } = await import(
    "../../toss-shop/lib/seller-engine/toss-seo-engine.ts"
  );
  const bad = analyzeTitleSeo({
    title: "최저가!! 정품보장 판매량 1위 무료배송 상품",
    mainKeyword: "방울토마토", productName: "방울토마토 1kg", category: "food",
    searchKeywords: ["a", "b"],
  });
  assert.ok(bad.score < 50, `금지어 범벅 제목은 낮은 점수여야 (got ${bad.score})`);
  assert.ok(bad.issues.some((i) => i.includes("메인 키워드")), "메인 키워드 누락 지적해야");
  assert.ok(bad.optimizedTitle.startsWith("방울토마토"), "최적화 제목은 메인키워드로 시작");

  const good = analyzeTitleSeo({
    title: "방울토마토 1kg 국내산 신선 당일발송 대용량 파티용",
    mainKeyword: "방울토마토", productName: "방울토마토 1kg", category: "food",
    searchKeywords: buildSearchKeywords({ mainKeyword: "방울토마토", productName: "방울토마토 1kg 국내산", category: "food" }),
  });
  assert.ok(good.score > bad.score);

  const kws = buildSearchKeywords({ mainKeyword: "방울토마토", productName: "방울토마토 1kg 국내산 신선", category: "food" });
  assert.ok(kws.length >= 5 && kws.length <= 10, `키워드 5~10개 (got ${kws.length})`);
  assert.equal(kws[0], "방울토마토");
  assert.equal(new Set(kws).size, kws.length, "키워드 중복 없어야");

  assert.ok(!optimizeTitle({ mainKeyword: "가디건", productName: "최저가 가디건 정품보장", category: "fashion" }).includes("최저가"));
});

test("sourcing plan: daily target is derived from the goal, not hardcoded", async () => {
  const { computeSourcingPlan, findRequiredSkuCount, SOURCING_FALLBACK_PER_DAY } = await import(
    "../../toss-shop/lib/seller-engine/sourcing-plan.ts"
  );
  const weak = {
    baselineDailyUnits: 3, netProfitPerUnitKrw: 5800,
    competitionIntensity: 1.5, competitorAvgReviews: 300, seoScore: 70,
  };
  const strong = {
    baselineDailyUnits: 4, netProfitPerUnitKrw: 7000,
    competitionIntensity: 0.8, competitorAvgReviews: 50, seoScore: 85,
  };

  // 경제성이 좋을수록 목표 달성에 필요한 SKU가 적어야 한다
  const needWeak = findRequiredSkuCount({ econ: weak, dataQuality: "live", goalKrw: 10_000_000 });
  const needStrong = findRequiredSkuCount({ econ: strong, dataQuality: "live", goalKrw: 10_000_000 });
  assert.ok(needStrong < needWeak, `좋은 SKU면 더 적게 필요 (${needStrong} < ${needWeak})`);

  // 누적이 늘수록 오늘 필요한 소싱량은 줄어야 한다
  const early = computeSourcingPlan({ currentSkus: 0, econ: weak, dataQuality: "live", goalKrw: 10_000_000 });
  const later = computeSourcingPlan({ currentSkus: 80, econ: weak, dataQuality: "live", goalKrw: 10_000_000 });
  assert.equal(early.mode, "ramp");
  assert.ok(later.dailyTarget <= early.dailyTarget, "누적이 쌓이면 일일 목표 감소");

  // 목표를 넘기면 유지 모드로 전환
  const done = computeSourcingPlan({ currentSkus: 300, econ: strong, dataQuality: "live", goalKrw: 10_000_000 });
  assert.equal(done.mode, "maintain");
  assert.ok(done.currentGoalProbPct >= 90);

  // demo 데이터면 역산값이 아니라 고정 기본값을 써야 한다 (못 믿을 값을 쓰면 안 됨)
  const demo = computeSourcingPlan({ currentSkus: 0, econ: weak, dataQuality: "demo", goalKrw: 10_000_000 });
  assert.equal(demo.trustworthy, false);
  assert.equal(demo.mode, "unknown");
  assert.equal(demo.dailyTarget, SOURCING_FALLBACK_PER_DAY);
});

test("sourcing plan: daily target respects the safety cap", async () => {
  const { computeSourcingPlan, sourcingMaxPerDay } = await import(
    "../../toss-shop/lib/seller-engine/sourcing-plan.ts"
  );
  const terrible = {
    baselineDailyUnits: 0.4, netProfitPerUnitKrw: 900,
    competitionIntensity: 2.5, competitorAvgReviews: 5000, seoScore: 30,
  };
  const plan = computeSourcingPlan({
    currentSkus: 0, econ: terrible, dataQuality: "live", goalKrw: 10_000_000, horizonDays: 1,
  });
  assert.ok(plan.dailyTarget <= sourcingMaxPerDay(), "상한을 넘으면 안 됨");
  assert.match(plan.reason, /상한/);
});

test("toss policy: 배송 인센티브는 4조건 모두 충족해야 수수료 0%", async () => {
  const { evaluateShippingIncentive, tossFees, incentiveProfitUplift } = await import(
    "../../toss-shop/lib/seller-engine/toss-policy-engine.ts"
  );
  const ok = evaluateShippingIncentive({
    penaltyPoints: 0, todayDispatchEnabled: true, shipmentsLast7BizDays: 3, onTimeRatePct: 100,
  });
  assert.equal(ok.eligible, true);
  assert.equal(ok.salesFeeRate, 0);

  // 4조건 각각이 단독으로 자격을 무효화해야 한다
  const cases = [
    { penaltyPoints: 1, todayDispatchEnabled: true, shipmentsLast7BizDays: 3, onTimeRatePct: 100 },
    { penaltyPoints: 0, todayDispatchEnabled: false, shipmentsLast7BizDays: 3, onTimeRatePct: 100 },
    { penaltyPoints: 0, todayDispatchEnabled: true, shipmentsLast7BizDays: 0, onTimeRatePct: 100 },
    { penaltyPoints: 0, todayDispatchEnabled: true, shipmentsLast7BizDays: 3, onTimeRatePct: 99 },
  ];
  for (const c of cases) {
    const v = evaluateShippingIncentive(c);
    assert.equal(v.eligible, false, `조건 미충족인데 통과됨: ${JSON.stringify(c)}`);
    assert.ok(v.failed.length > 0 && v.actions.length > 0);
  }

  // 인센티브는 판매수수료만 0으로, 결제수수료는 남는다
  assert.ok(tossFees(20000, true) < tossFees(20000, false));
  assert.ok(tossFees(20000, true) > 0, "결제수수료는 인센티브와 무관하게 발생");
  assert.equal(incentiveProfitUplift(20000), 1600);
});

test("toss policy: 카탈로그 대표 미선정이면 노출이 막힌다", async () => {
  const { evaluateCatalogPosition } = await import("../../toss-shop/lib/seller-engine/toss-policy-engine.ts");

  // 총가격 열세 → 대표 불가 → 자연노출·광고 모두 제한 → 구성 차별화로 탈출
  const losing = evaluateCatalogPosition({
    likelyMerged: true, myTotalKrw: 21000, bestTotalKrw: 19000, inStock: true, freeShipping: false,
  });
  assert.equal(losing.canWinRepresentative, false);
  assert.equal(losing.exposureBlocked, true);
  assert.equal(losing.strategy, "differentiate");
  assert.equal(losing.gapKrw, 2000);

  // 품절이면 공식 기준상 대표 선정 대상에서 제외
  const soldOut = evaluateCatalogPosition({
    likelyMerged: true, myTotalKrw: 18000, bestTotalKrw: 19000, inStock: false, freeShipping: true,
  });
  assert.equal(soldOut.canWinRepresentative, false);

  // 총가격 우위 + 재고 있음 → 대표 가능
  const winning = evaluateCatalogPosition({
    likelyMerged: true, myTotalKrw: 18000, bestTotalKrw: 19000, inStock: true, freeShipping: true,
  });
  assert.equal(winning.canWinRepresentative, true);
  assert.equal(winning.exposureBlocked, false);

  // 구성 차별화로 별도 카탈로그면 최저가 경쟁 자체를 피한다
  const standalone = evaluateCatalogPosition({
    likelyMerged: false, myTotalKrw: 25000, bestTotalKrw: 19000, inStock: true, freeShipping: true,
  });
  assert.equal(standalone.strategy, "safe_standalone");
  assert.equal(standalone.exposureBlocked, false);
});

test("toss policy: 페널티·등록규칙 검증", async () => {
  const { assessPenaltyRisk, checkListingCompliance } = await import(
    "../../toss-shop/lib/seller-engine/toss-policy-engine.ts"
  );
  assert.equal(assessPenaltyRisk(0).level, "safe");
  assert.equal(assessPenaltyRisk(0).losesIncentive, false);
  assert.equal(assessPenaltyRisk(1).losesIncentive, true, "페널티 1점만 있어도 수수료 0% 자격 상실");
  assert.equal(assessPenaltyRisk(10).level, "critical");
  assert.match(assessPenaltyRisk(10, 1).note, /영구/);

  // 비법정 계량단위는 block
  const units = checkListingCompliance({ name: "금 한 돈 5 돈 목걸이", searchKeywords: ["a","b","c","d","e"] });
  assert.ok(units.some((i) => i.severity === "block" && i.message.includes("법정계량단위")));

  // 수량·색상은 상품명이 아니라 검색키워드로
  const qty = checkListingCompliance({ name: "방울토마토 3팩 블랙", searchKeywords: ["a","b","c","d","e"] });
  assert.ok(qty.some((i) => i.field === "name" && i.message.includes("검색 키워드")));

  const clean = checkListingCompliance({
    name: "방울토마토 국내산 당일발송", searchKeywords: ["a","b","c","d","e","f"],
  });
  assert.equal(clean.filter((i) => i.severity === "block").length, 0);
});

test("ad economics: 손익분기 CPC = 판매가 × 수수료율 × 전환율", async () => {
  const { computeAdEconomics } = await import("../../toss-shop/lib/seller-engine/toss-growth-levers.ts");

  // 광고로 팔면 수수료 8% 면제 → 그 면제분이 광고비보다 크면 이득
  const a = computeAdEconomics({
    priceKrw: 20000, grossMarginKrw: 8000, conversionRatePct: 3, alreadyFeeFree: false,
  });
  assert.equal(a.feeSavedPerSaleKrw, 1600, "20,000원의 8%");
  assert.equal(a.breakevenCpcKrw, 48, "1600 × 0.03");
  assert.equal(a.recommendation, "run");

  // 전환율이 오르면 더 비싼 CPC도 감당된다
  const hi = computeAdEconomics({
    priceKrw: 20000, grossMarginKrw: 8000, conversionRatePct: 6, alreadyFeeFree: false,
  });
  assert.ok(hi.breakevenCpcKrw > a.breakevenCpcKrw);

  // 손익분기를 크게 넘는 입찰은 중단시켜야 한다
  const over = computeAdEconomics({
    priceKrw: 20000, grossMarginKrw: 8000, conversionRatePct: 3,
    alreadyFeeFree: false, currentCpcKrw: 200,
  });
  assert.equal(over.recommendation, "stop");
  assert.ok((over.netDeltaPerSaleKrw ?? 0) < 0);

  // 전환율 미측정이면 입찰 근거가 없다
  const noData = computeAdEconomics({
    priceKrw: 20000, grossMarginKrw: 8000, conversionRatePct: 0, alreadyFeeFree: false,
  });
  assert.equal(noData.recommendation, "cannot_bid");
});

test("ad economics: 배송 인센티브로 이미 0%면 수수료 면제가 중복되지 않는다", async () => {
  const { computeAdEconomics } = await import("../../toss-shop/lib/seller-engine/toss-growth-levers.ts");
  const ff = computeAdEconomics({
    priceKrw: 20000, grossMarginKrw: 8000, conversionRatePct: 3,
    alreadyFeeFree: true, currentCpcKrw: 50,
  });
  assert.equal(ff.feeSavedPerSaleKrw, 0, "이미 0%면 추가 면제 없음");
  assert.equal(ff.breakevenCpcKrw, 0);
  assert.match(ff.reason, /중복되지 않는다/);
});

test("cart coupon: 전환율 상승분이 쿠폰 비용보다 클 때만 실행", async () => {
  const { planCartCoupon, bestCartCouponDiscount, CART_COUPON_CVR_UPLIFT_PCT } = await import(
    "../../toss-shop/lib/seller-engine/toss-growth-levers.ts"
  );
  assert.equal(CART_COUPON_CVR_UPLIFT_PCT, 45);

  // 할인이 단위순익을 넘으면 팔수록 손해 → 실행 금지
  const tooDeep = planCartCoupon({
    priceKrw: 20000, netProfitPerUnitKrw: 1000, abandonedCarts: 100, discountPct: 15,
  });
  assert.equal(tooDeep.worthIt, false);
  assert.ok(tooDeep.netAfterCouponKrw < 0);
  assert.match(tooDeep.reason, /손해/);

  // 정상 마진이면 이득이어야 하고, 최적 할인율을 찾아야 한다
  const best = bestCartCouponDiscount({
    priceKrw: 20000, netProfitPerUnitKrw: 5900, abandonedCarts: 100,
  });
  assert.equal(best.worthIt, true);
  assert.ok(best.expectedNetDeltaKrw > 0);
  assert.ok(best.netAfterCouponKrw > 0);
});

test("catalog entry: 대장과 같은 카탈로그면 묶음 구성으로 회피한다", async () => {
  const { decideCatalogEntry } = await import(
    "../../toss-shop/lib/seller-engine/catalog-entry-strategy.ts"
  );
  // 대장이 여유 있는 가격 → 묶음이 최저가 경쟁보다 유리해야 한다
  const v = decideCatalogEntry({
    supplierUnitKrw: 12000, supplierShippingKrw: 2500,
    incumbentPriceKrw: 22000, incumbentShippingKrw: 0, baselineDailyUnits: 3,
  });
  assert.equal(v.sourceable, true);
  assert.ok(v.best.strategy.startsWith("bundle"), `묶음이 선택되어야: ${v.best.strategy}`);
  assert.equal(v.best.separateCatalog, true, "별도 카탈로그라야 대장과 경쟁 안 함");
  assert.equal(v.best.winsRepresentative, true);

  const undercut = v.options.find((o) => o.strategy === "undercut");
  assert.ok(v.best.dailyProfitKrw > undercut.dailyProfitKrw, "묶음이 최저가경쟁보다 수익 커야");
});

test("catalog entry: 묶음가가 대장 단품 N개보다 비싸면 팔리지 않는다", async () => {
  const { decideCatalogEntry } = await import(
    "../../toss-shop/lib/seller-engine/catalog-entry-strategy.ts"
  );
  // 대장이 원가 근처 → 최저가는 역마진, 묶음은 마진하한 때문에 시장가 위로 밀림
  const dead = decideCatalogEntry({
    supplierUnitKrw: 12000, supplierShippingKrw: 2500,
    incumbentPriceKrw: 15000, incumbentShippingKrw: 0, baselineDailyUnits: 3,
  });
  assert.equal(dead.sourceable, false, "수익 안 나면 소싱 거부해야");
  assert.equal(dead.best.strategy, "reject");

  const b2 = dead.options.find((o) => o.strategy === "bundle_2");
  assert.equal(b2.dailyProfitKrw, 0, "고객은 대장 단품을 2번 사면 되므로 안 팔림");
  assert.match(b2.note, /비싸다/);

  // 최저가 경쟁은 역마진이라 대표를 딸 수 없다
  const uc = dead.options.find((o) => o.strategy === "undercut");
  assert.ok(uc.marginPct < 0);
  assert.equal(uc.winsRepresentative, false);
});

test("catalog entry: 묶음은 배송비가 1건분이라 단위마진이 개선된다", async () => {
  const { decideCatalogEntry } = await import(
    "../../toss-shop/lib/seller-engine/catalog-entry-strategy.ts"
  );
  const v = decideCatalogEntry({
    supplierUnitKrw: 12000, supplierShippingKrw: 2500,
    incumbentPriceKrw: 22000, incumbentShippingKrw: 0, baselineDailyUnits: 3,
  });
  const b2 = v.options.find((o) => o.strategy === "bundle_2");
  const uc = v.options.find((o) => o.strategy === "undercut");
  // 2입은 배송비를 1번만 부담하므로 마진율이 단품 최저가보다 높아야 한다
  assert.ok(b2.marginPct > uc.marginPct, `묶음 마진 ${b2.marginPct}% > 단품 ${uc.marginPct}%`);
});
