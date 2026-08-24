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
