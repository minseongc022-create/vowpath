import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSettlementCsv } from "../../toss-shop/lib/settlement-csv.ts";
import { mapApiProductsToCatalog, reconcileImportedSettlements } from "../../toss-shop/lib/api/mappers.ts";


/**
 * 토스 상품 등록이 **필수로** 부르는 부속 조회를 흉내낸다.
 *
 * 등록 payload에는 카테고리마다 다른 필수 항목이 있다 — 구매옵션
 * (constraint-templates)과 정보제공 고시(notices). 실제로 이걸 안 채워서
 * 토스가 `{"stocks":"필수 값이 누락되었습니다."}`로 거절했다.
 * 그 뒤로 등록 경로가 두 엔드포인트를 더 부르므로, mock도 같이 답해야 한다.
 *
 * 처리한 요청이면 Response를, 아니면 null을 돌려준다.
 */
function mockTossRequirements(href) {
  if (href.includes("constraint-templates")) {
    return new Response(
      JSON.stringify({
        resultType: "SUCCESS",
        success: { categorySalesOptions: [], categorySearchOptions: [] },
      }),
      { status: 200 },
    );
  }
  if (href.includes("notices/category-codes")) {
    return new Response(
      JSON.stringify({
        resultType: "SUCCESS",
        success: {
          items: [
            { categoryCode: "COSMETIC", firstCategoryName: "화장품" },
            { categoryCode: "ETC_GOODS", firstCategoryName: "기타 재화" },
          ],
        },
      }),
      { status: 200 },
    );
  }
  if (href.includes("/notices")) {
    return new Response(
      JSON.stringify({
        resultType: "SUCCESS",
        success: { items: [{ id: 27, title: "1. 제품 소재" }, { id: 29, title: "2. 제조자" }] },
      }),
      { status: 200 },
    );
  }
  return null;
}

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
    const reqMock = mockTossRequirements(href);
    if (reqMock) return reqMock;
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

  // 토스는 이미지 없는 상품을 거절한다("상세 이미지 또는 html을 찾을 수 없음").
  // 프로덕션에서는 도매꾹 상품 사진이 여기 들어온다 — 시드 카탈로그에는
  // 그 사진이 없으므로, 등록 경로를 끝까지 태우려면 여기서 채워준다.
  draft.detailPage.thumbnailUrl ??= "https://img.example/seed-thumb.jpg";

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

// ── 교환·반품지 결정 엔진 ────────────────────────────────────────────
// 위탁은 공급처마다 반품 수거 방식이 달라(공급처 직접수거 vs 셀러 처리)
// 반품지를 하나로 고정하면 왕복 배송비 손실·반품 미아·분쟁이 발생한다.

async function loadReturnLocationEngine() {
  const mod = await import("../../toss-shop/lib/api/exchange-return-location.ts");
  mod.clearReturnLocationMapCache();
  return mod;
}

function clearReturnLocationEnv() {
  delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID;
  delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP;
  delete process.env.TOSS_SHOP_RETURN_LOCATION_STRICT;
  delete process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED;
}

test("return location: 공급처 단위 > 플랫폼 > 모드 > 기본 순으로 구체적인 것이 이긴다", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  // 기본값 폴백을 쓰려면 그 주소가 셀러 자체 주소임을 선언해야 한다
  // (성격 미상 주소는 남의 반품을 받게 될 수 있어 차단된다)
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({
    "domeggook:12345": 201,
    domeggook: 202,
    "mode:consignment": 203,
  });

  // 도매꾹 한 플랫폼 안에 공급사가 수천 개이므로 공급사 ID가 최우선이어야 한다.
  const bySupplier = resolveReturnLocation({
    supplierPlatform: "domeggook",
    supplierId: "12345",
    pickMode: "consignment",
  });
  assert.equal(bySupplier.locationId, 201);
  assert.equal(bySupplier.source, "supplier");
  assert.equal(bySupplier.matchedKey, "domeggook:12345");

  // 매핑되지 않은 공급사 → 같은 플랫폼의 플랫폼 단위 반품지로 내려간다.
  const byPlatform = resolveReturnLocation({
    supplierPlatform: "domeggook",
    supplierId: "99999",
    pickMode: "consignment",
  });
  assert.equal(byPlatform.locationId, 202);
  assert.equal(byPlatform.source, "platform");

  // 매핑에 없는 플랫폼 → 모드 단위
  const byMode = resolveReturnLocation({ supplierPlatform: "domeme", pickMode: "consignment" });
  assert.equal(byMode.locationId, 203);
  assert.equal(byMode.source, "mode");

  // 아무 키도 안 맞으면 기본 반품지 + 경고
  const byDefault = resolveReturnLocation({ supplierPlatform: "1688", pickMode: "import" });
  assert.equal(byDefault.locationId, 100);
  assert.equal(byDefault.source, "default");
  assert.ok(byDefault.warnings.some((w) => w.includes("왕복 배송비")));
});

test("return location: 사용자가 직접 지정한 반품지가 항상 최우선", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ "domeggook:12345": 201 });

  const d = resolveReturnLocation({
    explicitLocationId: 777,
    supplierPlatform: "domeggook",
    supplierId: "12345",
    pickMode: "consignment",
  });
  assert.equal(d.locationId, 777);
  assert.equal(d.source, "explicit");
});

test("return location: 매핑 JSON이 깨지면 fail-closed로 등록을 차단한다", async (t) => {
  const { resolveReturnLocation, isReturnLocationResolved } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";

  // 기본 반품지가 멀쩡히 있어도 조용히 폴백하면 안 된다 —
  // 셀러는 매핑이 동작한다고 믿는 동안 전 SKU가 틀린 주소로 등록된다.
  const { clearReturnLocationMapCache } = await loadReturnLocationEngine();
  for (const broken of ["{not-json", "[1,2,3]", '{"domeggook":"셋째창고"}', '{"domeggook":0}']) {
    process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = broken;
    clearReturnLocationMapCache();
    const d = resolveReturnLocation({ supplierPlatform: "domeggook", pickMode: "consignment" });
    assert.equal(isReturnLocationResolved(d), false, `${broken} 는 차단돼야 함`);
    assert.equal(d.error.code, "MAP_INVALID");
    assert.equal(d.locationId, undefined);
  }
});

test("return location: STRICT는 매핑 누락을 차단, 기본 모드는 경고 후 진행", async (t) => {
  const { resolveReturnLocation, isReturnLocationResolved } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ "domeggook:12345": 201 });

  // 셀러 처리형이어야 기본 반품지 폴백이 의미가 있다
  const lookup = {
    supplierPlatform: "domeggook", supplierId: "99999",
    pickMode: "consignment", returnHandling: "seller_handles",
  };

  // 사람이 승인 화면에서 보는 경로 → 경고만 남기고 등록은 진행
  const lenient = resolveReturnLocation(lookup);
  assert.equal(isReturnLocationResolved(lenient), true);
  assert.equal(lenient.source, "default");
  assert.ok(lenient.warnings.length > 0);

  // 무인 자동등록 경로 → 잘못된 반품지가 수십 건 쌓이므로 차단
  const strict = resolveReturnLocation({ ...lookup, strict: true });
  assert.equal(isReturnLocationResolved(strict), false);
  assert.equal(strict.error.code, "UNMAPPED");
  assert.ok(strict.error.message.includes("domeggook:99999"));

  // env로도 STRICT를 켤 수 있어야 한다
  process.env.TOSS_SHOP_RETURN_LOCATION_STRICT = "true";
  assert.equal(resolveReturnLocation(lookup).error.code, "UNMAPPED");
});

test("return location: 기본값도 매핑도 없으면 MISSING", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);
  clearReturnLocationEnv();

  const d = resolveReturnLocation({ supplierPlatform: "domeggook", pickMode: "consignment" });
  assert.equal(d.error.code, "MISSING");
  assert.equal(d.source, "unresolved");
});

test("return location: 수입 건의 국가명은 플랫폼 키로 오인되지 않는다", async (t) => {
  const { resolveReturnLocation, buildReturnLocationKeys } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  // 수입에서 supplierPlatform은 "중국"/"일본" 같은 국가명이다.
  // 반품을 해외로 보낼 수는 없으므로 국가를 공급처처럼 취급하면 안 된다.
  const keys = buildReturnLocationKeys({ supplierPlatform: "중국", pickMode: "import" });
  assert.ok(keys.includes("country:중국"));
  assert.ok(!keys.includes("중국"), "국가명이 플랫폼 키로 새면 안 됨");
  assert.ok(keys.includes("mode:import"));

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ "mode:import": 501 });
  const d = resolveReturnLocation({ supplierPlatform: "중국", pickMode: "import" });
  assert.equal(d.locationId, 501, "수입 반품지는 mode:import 국내 주소로 잡혀야 함");
  assert.equal(d.source, "mode");
});

test("return location: 매핑 미설정 수입 건은 국내 반품지 확인 경고를 남긴다", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  const d = resolveReturnLocation({
    supplierPlatform: "중국", pickMode: "import", returnHandling: "seller_handles",
  });
  assert.equal(d.locationId, 100);
  assert.ok(d.warnings.some((w) => w.includes("해외로 보낼 수 없습니다")));
});

test("return location: 숫자 문자열 값과 키 대소문자·공백을 정규화한다", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  // Vercel 환경변수는 문자열로만 들어오는 경우가 흔하다.
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ "  DomeGgook:AB12  ": "301" });
  const d = resolveReturnLocation({ supplierPlatform: "domeggook", supplierId: "ab12" });
  assert.equal(d.locationId, 301);
  assert.equal(d.source, "supplier");
});

test("return location: 초안에 결정 근거가 남아 사후 추적이 가능하다", async (t) => {
  const { resolveReturnLocation } = await loadReturnLocationEngine();
  t.after(clearReturnLocationEnv);

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ domeggook: 202 });
  const d = resolveReturnLocation({
    supplierPlatform: "domeggook",
    supplierId: "12345",
    pickMode: "consignment",
  });

  assert.deepEqual(d.triedKeys, ["domeggook:12345", "domeggook", "mode:consignment"]);
  assert.equal(d.matchedKey, "domeggook");
  assert.ok(d.engineVersion);
  // 저장 가능한 순수 데이터여야 KV에 그대로 들어간다
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
});

test("health check: 반품지 매핑이 깨지면 헬스체크가 fail로 드러낸다", async (t) => {
  const { runJarvisHealthCheck } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-health-check.ts"
  );
  const { clearReturnLocationMapCache } = await loadReturnLocationEngine();
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
  });

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = "{broken";
  clearReturnLocationMapCache();
  const broken = runJarvisHealthCheck({ hasOpenAi: false });
  const brokenCheck = broken.checks.find((c) => c.id === "return_location");
  assert.ok(brokenCheck, "return_location 체크가 있어야 함");
  assert.equal(brokenCheck.passed, false);
  assert.match(brokenCheck.detail, /매핑 JSON 오류/);

  // 매핑에 공급처 전용 주소 + 셀러 자체 주소(seller_default)가 함께 선언되면 통과
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({
    "domeggook:1": 2,
    seller_default: 3,
  });
  clearReturnLocationMapCache();
  const okCheck = runJarvisHealthCheck({ hasOpenAi: false }).checks.find(
    (c) => c.id === "return_location",
  );
  assert.equal(okCheck.passed, true);
  assert.match(okCheck.detail, /공급처 매핑/);

  // 기본 반품지만 있고 성격이 선언되지 않으면 fail — 남의 주소일 수 있다
  delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP;
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "777";
  clearReturnLocationMapCache();
  const undeclared = runJarvisHealthCheck({ hasOpenAi: false }).checks.find(
    (c) => c.id === "return_location",
  );
  assert.equal(undeclared.passed, false, "성격 미선언 기본 반품지는 위험으로 드러나야");
  assert.match(undeclared.detail, /성격 미선언/);
});

test("publish: 반품지 결정 실패는 등록을 차단하고 근거를 결과에 담는다", async (t) => {
  const { publishListingToToss } = await import("../../toss-shop/lib/api/create-product.ts");
  const { clearReturnLocationMapCache } = await loadReturnLocationEngine();
  const realFetchForPublish = globalThis.fetch;
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
    globalThis.fetch = realFetchForPublish;
  });

  let tossCalled = false;
  globalThis.fetch = async () => {
    tossCalled = true;
    return new Response(JSON.stringify({ resultType: "SUCCESS", success: { id: 1 } }), { status: 200 });
  };

  const draft = {
    pickMode: "consignment",
    keyword: "테스트",
    // 토스는 이미지 없는 상품을 거절한다 — 실제 등록 경로를 태우는 테스트는
    // 공급처 실사진이 있는 상태여야 한다
    detailPage: { thumbnailUrl: "https://img.example/thumb.jpg" },
    listingPayload: {
      name: "테스트 상품",
      brandName: "에피로드",
      salePrice: 19000,
      originPrice: 20000,
      searchKeywords: ["테스트"],
      description: "설명",
      categoryHint: "생활/홈",
      category: "home",
      deliveryFeeType: "FREE",
      supplierPlatform: "domeggook",
      supplierId: "12345",
    },
  };

  process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID = "555";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = "{broken";
  clearReturnLocationMapCache();

  const res = await publishListingToToss({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    draft,
    });

  assert.equal(res.ok, false);
  assert.equal(res.simulated, true, "설정 오류는 초안을 approved로 남겨 재실행 가능해야 함");
  assert.equal(res.returnLocation.error.code, "MAP_INVALID");
  assert.equal(tossCalled, false, "반품지가 확정되기 전에 토스를 호출하면 안 됨");
  delete process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID;
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
  // 1등급 + 당일발송 + 출고율 98%+ 세 조건이 모두 필요하다.
  // 배송 인센티브는 발송기한 준수율 100%를 요구하므로, 출고율이 낮으면
  // 오늘출발을 약속하는 순간 인센티브가 날아간다.
  const pass = readSupplierQuality({ grade: "우수", todayShip: "Y", shipRate: 99 });
  assert.equal(pass.verified, true);
  assert.equal(pass.grade, "excellent");
  assert.equal(pass.shipSpeed, "same_day");
  assert.equal(meetsSupplierPolicy(pass), true);

  // 출고율 미확인 → 탈락. "모르면 통과"는 fail-closed 위반이다.
  const noRate = readSupplierQuality({ grade: "우수", todayShip: "Y" });
  assert.equal(noRate.verified, true, "등급·출고속도는 판독됨");
  assert.equal(noRate.fulfillmentRatePct, undefined);
  assert.equal(meetsSupplierPolicy(noRate), false, "출고율 미확인은 오늘출발 약속 불가");

  // 97%는 종전 기준(80%)이면 통과했지만, 오늘출발 전략에서는 탈락이어야 한다.
  const almost = readSupplierQuality({ grade: "우수", todayShip: "Y", shipRate: 97 });
  assert.equal(meetsSupplierPolicy(almost), false, "98% 미만은 준수율 100%를 못 지킨다");

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
  assert.equal(badGate.passed, false, "등급 미확인이면 가점 게이트는 실패로 남아야");

  const good = computeJarvisConfidence({
    ...base,
    supplierQuality: readSupplierQuality({ grade: "우수", todayShip: "Y", shipRate: 99 }),
  });
  const goodGate = good.gates.find((g) => g.id === "supplier_grade");
  assert.equal(goodGate.passed, true);
  // supplier_grade는 이제 가점(soft)일 뿐 하드 게이트가 아니다 — 최상급 공급처를
  // 우대는 하되, 등급이 미확인이라는 이유만으로 인증을 막지 않는다.
  assert.ok(good.confidencePct >= bad.confidencePct);
});

test("jarvis gate: 등급 미확인이어도 나머지가 확실하면 인증을 막지 않는다", async () => {
  const { computeJarvisConfidence, assessIntegration, JARVIS_CONFIDENCE_THRESHOLD } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-engine.ts"
  );
  const { readSupplierQuality } = await import("../../toss-shop/lib/wholesale/supplier-quality.ts");

  // 도매꾹 API가 등급 필드를 안 주는 절대다수 공급처 상황을 재현한다.
  // 예전엔 이 하나 때문에 confidencePct가 92로 하드 캡됐다 — 마진·안전·
  // 카탈로그가 전부 확실해도 인증 자체가 안 됐다는 뜻이다.
  const result = computeJarvisConfidence({
    integration: assessIntegration({
      tossApiConfigured: true, wholesaleApiConfigured: true, dataQuality: "live", catalogSize: 50,
    }),
    v6MasterScore: 95, safetyScore: 95, marginPct: 30, monthlyProfitKrw: 900000, moq: 1,
    wholesaleLive: true, wholesalePlatform: "domeme", criticalRisks: 0, blockRisks: 0,
    competitionIntensity: 0.5, searchVolume: 5000, topSellerAlignment: 90,
    catalogStrategyMode: "avoid_catalog", isolationScore: 70,
    supplierQuality: readSupplierQuality({ title: "정보없음" }),
  });

  assert.equal(result.certified, true, "등급 미확인만으로 인증이 막히면 안 된다");
  assert.ok(result.confidencePct >= JARVIS_CONFIDENCE_THRESHOLD);
});

test("jarvis gate: 실측으로 확인된 위험한 공급처는 여전히 막는다", async () => {
  const { computeJarvisConfidence, assessIntegration } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-engine.ts"
  );
  const { readSupplierQuality } = await import("../../toss-shop/lib/wholesale/supplier-quality.ts");

  const result = computeJarvisConfidence({
    integration: assessIntegration({
      tossApiConfigured: true, wholesaleApiConfigured: true, dataQuality: "live", catalogSize: 50,
    }),
    v6MasterScore: 95, safetyScore: 95, marginPct: 30, monthlyProfitKrw: 900000, moq: 1,
    wholesaleLive: true, wholesalePlatform: "domeme", criticalRisks: 0, blockRisks: 0,
    competitionIntensity: 0.5, searchVolume: 5000, topSellerAlignment: 90,
    catalogStrategyMode: "avoid_catalog", isolationScore: 70,
    // grade·shipDays·shipRate가 전부 판독돼 verified:true가 되고, 출고율이
    // 실측 60%로 확인된 상황 — 미확인이 아니라 확인된 나쁨이므로 막아야 한다.
    supplierQuality: readSupplierQuality({ grade: "일반", shipDays: 3, shipRate: 60 }),
  });

  const safeGate = result.gates.find((g) => g.id === "supplier_safe");
  assert.equal(safeGate.passed, false, "위험 신호가 실측되면 supplier_safe가 실패해야");
  assert.equal(result.certified, false, "위험이 확인된 공급처는 인증되면 안 된다");
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

test("pipeline: 소싱 픽에 카탈로그 진입전략이 실제로 적용된다", async () => {
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");
  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-24");
  assert.ok(picks.length > 0);

  for (const p of picks) {
    assert.ok(p.catalogEntry, `${p.keyword}: 진입전략이 계산되어야`);
    // 소싱된 픽은 수익 가능한 진입 경로가 있어야 한다
    assert.equal(p.catalogEntry.sourceable, true, `${p.keyword}: 수익 안 나는 픽이 통과됨`);
    // 등록가는 진입전략이 정한 가격이어야 한다
    assert.equal(p.recommendedPriceKrw, p.catalogEntry.best.priceKrw, `${p.keyword}: 등록가 불일치`);
    assert.ok(p.catalogEntry.best.netProfitKrw > 0);
  }
});

test("pipeline: 등록 규칙 위반이 초안에 기록되고 block이면 자동등록을 막는다", async () => {
  const { buildListingDraftFromPick } = await import("../../toss-shop/lib/seller-engine/listing-automation.ts");

  const basePick = {
    id: "p1", keyword: "목걸이", productName: "순금 5 돈 목걸이",
    suggestedTitle: "순금 5 돈 목걸이", category: "fashion",
    recommendedPriceKrw: 50000, supplierCostKrw: 30000,
    estimatedMarginPct: 30, estimatedDailyUnits: 2, estimatedDailyProfitKrw: 10000,
    searchVolume: 3000, competitionIntensity: 1.0, confidenceScore: 95,
    reason: "test", aiSummary: "테스트 상품",
    // 93% 인증 상태로 만들어 compliance만이 차단 요인이 되게 한다
    jarvis: { certified: true, confidencePct: 95, gates: [], jarvisVersion: "t", jackpotPct: 95,
      jackpotCertified: false, integration: {}, brief: "", monthlyPathNote: "", topSellerAlignment: 90 },
  };

  const blocked = await buildListingDraftFromPick({
    merchantId: "m", pick: basePick, mode: "consignment", draftId: "d1",
  });
  assert.ok(blocked.compliance, "compliance 결과가 초안에 있어야");
  const hasBlock = blocked.compliance.some((c) => c.severity === "block");
  assert.equal(hasBlock, true, "비법정 계량단위(돈)는 block이어야");
  assert.equal(blocked.status, "draft", "block이 있으면 인증됐어도 pending_review로 안 감");

  // 규칙 위반이 없으면 인증 상태 그대로 OK 대기로 간다
  const clean = await buildListingDraftFromPick({
    merchantId: "m",
    pick: { ...basePick, productName: "순금 목걸이 18.75g", suggestedTitle: "순금 목걸이 18.75g" },
    mode: "consignment", draftId: "d2",
  });
  assert.equal(clean.compliance.some((c) => c.severity === "block"), false);
  assert.equal(clean.status, "pending_review");
});

test("autopilot: 소싱 계획·광고 손익분기·쿠폰이 사이클에서 실제로 계산된다", async () => {
  const { runJarvisAutopilotCycle } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-autopilot-engine.ts"
  );
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");

  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-24");
  // 시드는 추정(demo) 데이터라 확실성 게이트를 통과하지 못한다 — 의도된 동작.
  // 이 테스트는 사이클 계산부를 검증하는 것이므로 실측 근거를 갖춘 픽으로 만든다.
  for (const p of picks) {
    p.jarvis = { ...(p.jarvis ?? {}), certified: true, confidencePct: 95 };
    p.estimatedMarginPct = Math.max(p.estimatedMarginPct, 20);
    p.estimatedMonthlyProfitKrw = Math.max(p.estimatedMonthlyProfitKrw ?? 0, 500_000);
    p.catalogStrategy = { ...(p.catalogStrategy ?? {}), mode: "avoid_catalog" };
    p.riskPlaybook = { ...(p.riskPlaybook ?? {}), criticalCount: 0, blockCount: 0 };
    p.wholesaleBest = {
      platform: "domeme", title: p.productName, unitPriceKrw: p.supplierCostKrw || 12000,
      shippingFeeKrw: 0, moq: 1, url: "https://x", freeShipping: true,
      source: "live", sellerId: "s1", sellerNick: "공급사",
      supplierQuality: {
        grade: "excellent", shipSpeed: "same_day", verified: true,
        fulfillmentRatePct: 99, readFrom: ["grade"], reason: "우수·당일발송",
      },
      policyText: "반품은 판매자가 직접 처리해주셔야 합니다.",
    };
  }

  const data = { consignmentPicks: picks, listingDrafts: [], fulfillmentJobs: [] };
  const report = await runJarvisAutopilotCycle({
    merchantId: "m1", accountEmail: "t@t.com", data, catalog: SEED_CATALOG, config: null,
  });

  assert.ok(report.stats.draftsCreated > 0, "초안이 생성되어야");
  assert.ok(
    report.actions.some((a) => a.startsWith("소싱 계획")),
    "소싱 계획이 사이클에서 계산되어 보고되어야",
  );

  const draft = data.listingDrafts[0];
  assert.ok(draft.adEconomics, "광고 손익분기가 초안에 붙어야");
  assert.ok(draft.adEconomics.breakevenCpcKrw > 0);
  assert.ok(draft.cartCoupon, "장바구니 쿠폰 설계가 초안에 붙어야");
  assert.ok(draft.compliance, "등록규칙 검증 결과가 초안에 있어야");
});

test("sourcing plan: 같은 입력이면 캐시로 재계산하지 않는다", async () => {
  const { computeSourcingPlan } = await import("../../toss-shop/lib/seller-engine/sourcing-plan.ts");
  const args = {
    currentSkus: 7,
    econ: {
      baselineDailyUnits: 3, netProfitPerUnitKrw: 5900,
      competitionIntensity: 1.0, competitorAvgReviews: 120, seoScore: 85,
    },
    dataQuality: "live", goalKrw: 10_000_000,
  };
  const first = computeSourcingPlan(args);
  const t0 = Date.now();
  const second = computeSourcingPlan(args);
  const elapsed = Date.now() - t0;

  assert.deepEqual(second, first, "같은 입력이면 같은 계획");
  assert.ok(elapsed < 20, `캐시 히트는 즉시여야 (${elapsed}ms)`);

  // 누적 SKU가 달라지면 다시 계산되어야 한다
  const changed = computeSourcingPlan({ ...args, currentSkus: 60 });
  assert.notEqual(changed.currentSkus, first.currentSkus);
});

test("ai image studio: disabled without OPENAI_API_KEY, never blocks callers", async () => {
  const { aiImagesEnabled, regenerateProductBackground, generateSellingPointBadges, upgradeDetailImages } =
    await import("../../toss-shop/lib/seller-engine/ai-image-studio.ts");

  const had = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(aiImagesEnabled(), false);
    assert.equal(await regenerateProductBackground({ imageUrl: "https://x/y.jpg", category: "food", productLabel: "테스트" }), null);
    assert.deepEqual(await generateSellingPointBadges({ sellingPoints: ["당일발송"] }), []);
    const up = await upgradeDetailImages({ heroImageUrl: "https://x/y.jpg", category: "food", productLabel: "t", sellingPoints: ["a"] });
    assert.deepEqual(up, { heroUrl: null, badges: [] });
  } finally {
    if (had !== undefined) process.env.OPENAI_API_KEY = had;
  }
});

test("ai image studio: JARVIS_AI_IMAGES=false is an explicit opt-out even with a key", async () => {
  const { aiImagesEnabled } = await import("../../toss-shop/lib/seller-engine/ai-image-studio.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  const hadFlag = process.env.JARVIS_AI_IMAGES;
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.JARVIS_AI_IMAGES = "false";
  try {
    assert.equal(aiImagesEnabled(), false);
  } finally {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
    hadFlag === undefined ? delete process.env.JARVIS_AI_IMAGES : (process.env.JARVIS_AI_IMAGES = hadFlag);
  }
});

test("ai image studio: end-to-end with mocked OpenAI Images API (no network/real key)", async (t) => {
  const { regenerateProductBackground, generateSellingPointBadges } = await import(
    "../../toss-shop/lib/seller-engine/ai-image-studio.ts"
  );

  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
  });

  // 64x64 랜덤 노이즈 PNG (base64, ~12KB) — fetchImageAsPngBuffer의 500바이트
  // 최소 크기 가드(깨진/placeholder 이미지 거부)를 realistically 통과시키기 위함
  const tinyPngBase64 = "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";

  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    if (href.includes("images/edits")) {
      return new Response(JSON.stringify({ data: [{ b64_json: tinyPngBase64 }] }), { status: 200 });
    }
    if (href.includes("images/generations")) {
      return new Response(JSON.stringify({ data: [{ b64_json: tinyPngBase64 }] }), { status: 200 });
    }
    // 원본 상품 이미지 fetch (배경 재구성 입력용)
    return new Response(Buffer.from(tinyPngBase64, "base64"), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });
  };

  const bg = await regenerateProductBackground({
    imageUrl: "https://supplier.example/product.jpg",
    category: "food",
    productLabel: "테스트 상품",
  });
  assert.ok(bg, "배경 재구성 결과가 있어야");
  assert.match(bg.url, /^\/api\/toss-shop\/ai-images\//);

  const badges = await generateSellingPointBadges({ sellingPoints: ["당일발송", "1등급 공급처", "국내산"] });
  assert.equal(badges.length, 3, "셀링포인트 3개 전부 배지가 생성되어야");
  for (const b of badges) assert.match(b.url, /^\/api\/toss-shop\/ai-images\//);
});

test("ai image studio: 배지는 최대 3장으로 제한된다 (비용 통제)", async (t) => {
  const { generateSellingPointBadges } = await import("../../toss-shop/lib/seller-engine/ai-image-studio.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
  });

  let calls = 0;
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  // 64x64 랜덤 노이즈 PNG (base64, ~12KB) — fetchImageAsPngBuffer의 500바이트
  // 최소 크기 가드(깨진/placeholder 이미지 거부)를 realistically 통과시키기 위함
  const tinyPngBase64 = "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";
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ data: [{ b64_json: tinyPngBase64 }] }), { status: 200 });
  };

  const badges = await generateSellingPointBadges({
    sellingPoints: ["당일발송", "1등급 공급처", "국내산", "무료배송", "당일출고"],
  });
  assert.equal(badges.length, 3);
  assert.equal(calls, 3, "5개 중 3개까지만 API를 호출해야 (비용 통제)");
});

test("ai image studio: 기본 style은 진짜 스튜디오 촬영 프롬프트를 쓴다", async (t) => {
  const { regenerateProductBackground } = await import("../../toss-shop/lib/seller-engine/ai-image-studio.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
  });

  const tinyPngBase64 = "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";
  let capturedPrompt = "";
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    if (href.includes("images/edits")) {
      const body = opts.body;
      for (const [k, v] of body.entries()) if (k === "prompt") capturedPrompt = v;
      return new Response(JSON.stringify({ data: [{ b64_json: tinyPngBase64 }] }), { status: 200 });
    }
    return new Response(Buffer.from(tinyPngBase64, "base64"), { status: 200, headers: { "Content-Type": "image/png" } });
  };

  await regenerateProductBackground({ imageUrl: "https://supplier.example/p.jpg", category: "beauty", productLabel: "세럼" });
  assert.match(capturedPrompt, /studio/i, "기본 style은 studio 촬영 프롬프트여야");
  assert.match(capturedPrompt, /softbox|studio backdrop/i);
  // 형태 보존 제약 — 이게 느슨하면 모델이 로고·라벨을 다시 그려서 실물과
  // 다른 이미지가 되고, 그건 허위표시가 된다.
  assert.match(capturedPrompt, /faithful to the input image/i, "제품 불변 지시가 있어야");
  assert.match(capturedPrompt, /Do not rotate it/i, "회전 금지 — 안 보이던 면을 지어내면 안 된다");
  assert.match(
    capturedPrompt,
    /not already visible in the input/i,
    "원본에 없는 면을 만들지 말라는 지시가 있어야",
  );
  assert.match(capturedPrompt, /do not invent or redraw logos, labels/i, "로고·라벨 조작 금지");

  capturedPrompt = "";
  await regenerateProductBackground({
    imageUrl: "https://supplier.example/p.jpg", category: "beauty", productLabel: "세럼", style: "lifestyle",
  });
  assert.doesNotMatch(capturedPrompt, /softbox/i, "lifestyle style은 스튜디오 조명 문구를 쓰지 않아야");
});

test("ai image studio: 이미지 API가 실패해도 null/빈배열로 안전 폴백한다", async (t) => {
  const { regenerateProductBackground, generateSellingPointBadges } = await import(
    "../../toss-shop/lib/seller-engine/ai-image-studio.ts"
  );
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
  });

  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async () => new Response("rate limited", { status: 429 });

  const bg = await regenerateProductBackground({
    imageUrl: "https://supplier.example/product.jpg", category: "food", productLabel: "t",
  });
  assert.equal(bg, null, "API 실패 시 null — 호출부가 원본으로 폴백해야 함");

  const badges = await generateSellingPointBadges({ sellingPoints: ["당일발송"] });
  assert.deepEqual(badges, []);
});

test("health check: 최근 추가된 엔진(공급처 게이트·확률·SEO·광고·AI이미지)이 반영된다", async () => {
  const { runJarvisHealthCheck } = await import("../../toss-shop/lib/seller-engine/jarvis-health-check.ts");
  const { envFixHintForCheck } = await import("../../toss-shop/lib/seller-engine/jarvis-config.ts");

  const report = runJarvisHealthCheck({ hasOpenAi: false });
  const ids = report.checks.map((c) => c.id);
  for (const id of [
    "supplier_grade_gate", "profit_probability", "toss_seo_policy", "growth_levers", "ai_image_studio",
  ]) {
    assert.ok(ids.includes(id), `헬스체크에 ${id}가 있어야`);
  }

  // DOMEGGOOK_API_KEY, OPENAI_API_KEY 없으면 해당 항목은 실패로 표시되고 고치는 법이 있어야 한다
  const gate = report.checks.find((c) => c.id === "supplier_grade_gate");
  const images = report.checks.find((c) => c.id === "ai_image_studio");
  assert.equal(gate.passed, false);
  assert.equal(images.passed, false);
  assert.ok(envFixHintForCheck("supplier_grade_gate"));
  assert.ok(envFixHintForCheck("ai_image_studio"));

  // chatPromises에도 새 항목이 보고되어야 사용자가 대시보드에서 놓치지 않는다
  const topics = report.chatPromises.map((p) => p.topic);
  // 라벨이 "1등급·당일발송 게이트"에서 "위험 신호 판독"으로 바뀌었다 —
  // 등급 미확인은 더 이상 소싱을 막는 게이트가 아니기 때문이다.
  assert.ok(topics.some((t) => t.includes("위험 신호")));
  assert.ok(topics.some((t) => t.includes("AI 이미지")));
});

test("toss proxy fetch: 프록시 미설정 시 일반 fetch로 동작한다", async () => {
  const { tossProxyConfigured } = await import("../../toss-shop/lib/api/toss-proxy-fetch.ts");
  const had = {
    a: process.env.QUOTAGUARD_STATIC_URL,
    b: process.env.QUOTAGUARDSTATIC_URL,
    c: process.env.TOSS_API_PROXY_URL,
  };
  delete process.env.QUOTAGUARD_STATIC_URL;
  delete process.env.QUOTAGUARDSTATIC_URL;
  delete process.env.TOSS_API_PROXY_URL;
  try {
    assert.equal(tossProxyConfigured(), false);
  } finally {
    if (had.a !== undefined) process.env.QUOTAGUARD_STATIC_URL = had.a;
    if (had.b !== undefined) process.env.QUOTAGUARDSTATIC_URL = had.b;
    if (had.c !== undefined) process.env.TOSS_API_PROXY_URL = had.c;
  }
});

test("toss proxy fetch: 프록시 URL이 설정되면 실제로 그 프록시를 거쳐나간다", async (t) => {
  const http = await import("node:http");
  const { spawn } = await import("node:child_process");
  let connectCount = 0;
  let connectHost = "";
  const proxy = http.createServer();
  proxy.on("connect", (req, clientSocket) => {
    connectCount++;
    connectHost = req.url;
    clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
  });
  await new Promise((resolve) => proxy.listen(0, resolve));
  const port = proxy.address().port;
  t.after(() => proxy.close());

  // toss-proxy-fetch.ts는 dispatcher를 모듈 스코프에 한 번 캐싱하므로, 같은
  // 프로세스 안에서 재평가하면 앞선 테스트(프록시 미설정)의 상태를 물려받는다.
  // 실제 런타임(요청마다 새 함수 인스턴스)과 같은 조건으로 보려면 완전히
  // 새 프로세스에서 돌려야 한다.
  const script = `
    process.env.TOSS_API_PROXY_URL = "http://localhost:${port}";
    const { tossFetch, tossProxyConfigured } = await import(${JSON.stringify(
      new URL("../../toss-shop/lib/api/toss-proxy-fetch.ts", import.meta.url).href,
    )});
    if (!tossProxyConfigured()) { console.log("NOT_CONFIGURED"); process.exit(1); }
    try { await tossFetch("https://example.com/test", { method: "GET" }); } catch {}
    console.log("DONE");
  `;
  const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script]);
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  const exitCode = await new Promise((resolve) => child.on("close", resolve));

  assert.match(out, /DONE/, `자식 프로세스가 정상 완료해야 (exit=${exitCode}, out=${out})`);
  assert.equal(connectCount, 1, "요청이 설정한 프록시로 나가야 한다");
  assert.match(connectHost, /example\.com/);
});

// ── 수수료 모델: 수수료 0% 경로가 마진에 실제로 반영되는가 ──────────────

test("fee model: 배송 인센티브가 판매수수료를 0%로 만들고 결제수수료만 남긴다", async () => {
  const { computeFees, effectiveSalesFeeRate } = await import(
    "../../toss-shop/lib/seller-engine/fee-model.ts"
  );
  // 인센티브 없음 — 판매 8% + 결제 2.5%
  const plain = computeFees(20000);
  assert.equal(plain.salesFeeRate, 0.08);
  assert.equal(plain.salesFeeKrw, 1600);
  assert.equal(plain.paymentFeeKrw, 500);
  assert.equal(plain.totalFeeKrw, 2100);
  assert.equal(plain.incentiveApplied, false);

  // 인센티브 적용 — 판매수수료 0%, 결제수수료는 그대로 남는다
  const inc = computeFees(20000, { deliveryIncentiveEligible: true });
  assert.equal(inc.salesFeeRate, 0);
  assert.equal(inc.totalFeeKrw, 500);
  assert.equal(inc.incentiveApplied, true);

  // 건당 1,600원 차이 = 판매가의 8%
  assert.equal(plain.totalFeeKrw - inc.totalFeeKrw, 1600);
  assert.equal(effectiveSalesFeeRate({ deliveryIncentiveEligible: true }), 0);
});

test("fee model: 기본값은 보수적(8%) — 낙관값이 조용히 새면 안 된다", async () => {
  const { effectiveSalesFeeRate } = await import("../../toss-shop/lib/seller-engine/fee-model.ts");
  assert.equal(effectiveSalesFeeRate(), 0.08);
  assert.equal(effectiveSalesFeeRate({}), 0.08);
  assert.equal(effectiveSalesFeeRate({ deliveryIncentiveEligible: false }), 0.08);
});

test("fee model: 광고 유입분만 면제되어 가중평균된다", async () => {
  const { effectiveSalesFeeRate } = await import("../../toss-shop/lib/seller-engine/fee-model.ts");
  // 광고 유입 50%면 실효 판매수수료는 4%
  assert.equal(effectiveSalesFeeRate({ adAttributedSharePct: 50 }), 0.04);
  assert.equal(effectiveSalesFeeRate({ adAttributedSharePct: 100 }), 0);
  // 범위를 벗어난 값은 클램프
  assert.equal(effectiveSalesFeeRate({ adAttributedSharePct: 500 }), 0);
  assert.equal(effectiveSalesFeeRate({ adAttributedSharePct: -20 }), 0.08);
  // 인센티브가 걸리면 광고 비중과 무관하게 0%
  assert.equal(
    effectiveSalesFeeRate({ deliveryIncentiveEligible: true, adAttributedSharePct: 10 }),
    0,
  );
});

test("fee model: 인센티브가 마진을 8%p 끌어올린다 (마진 게이트 통과 여부가 갈린다)", async () => {
  const { marginPct } = await import("../../toss-shop/lib/seller-engine/pricing.ts");
  // 마진 게이트가 15%인데, 이 원가 구간(공급가 15,500 / 판매가 20,000)은
  // 인센티브 없이는 12%로 탈락하고 인센티브가 걸리면 20%로 통과한다.
  // 연결이 끊겨 있던 동안 이 구간의 SKU가 전부 억울하게 떨어지고 있었다.
  const cost = 15500;
  const price = 20000;
  const without = marginPct(cost, price);
  const withInc = marginPct(cost, price, { deliveryIncentiveEligible: true });
  assert.equal(without, 12);
  assert.equal(withInc, 20);
  assert.ok(withInc - without >= 7.9 && withInc - without <= 8.1, `8%p 차이여야: ${without} → ${withInc}`);
  assert.ok(without < 15, `인센티브 없이 ${without}% — 게이트 탈락`);
  assert.ok(withInc >= 15, `인센티브 적용 시 ${withInc}% — 게이트 통과`);
});

// ── 효자상품 엔진: 실정산 기준 판정 ───────────────────────────────────

function settlement(id, date, product, payout, status = "matched") {
  return {
    id, orderId: id, orderDate: date, productName: product,
    grossKrw: payout + 800, platformFeeKrw: 800, shippingFeeKrw: 0,
    expectedPayoutKrw: payout, status,
  };
}

/** n일간 매일 payout씩 팔린 SKU */
function steadySales(product, days, payout, startDay = 1) {
  return Array.from({ length: days }, (_, i) => {
    const d = String(startDay + i).padStart(2, "0");
    return settlement(`${product}-${i}`, `2026-08-${d}`, product, payout);
  });
}

test("winner engine: 정산 데이터가 없으면 판정하지 않고 이유를 남긴다", async () => {
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  const r = analyzeWinnerSkus({ settlements: [], goalKrw: 10_000_000 });
  assert.equal(r.skus.length, 0);
  assert.equal(r.actualMonthlyNetKrw, 0);
  assert.match(r.brief, /예측이 아니라 실제 입금액/);
});

test("winner engine: 표본 부족 SKU는 효자로 판정하지 않는다 (fail-closed)", async () => {
  const { analyzeWinnerSkus, MIN_ORDERS_FOR_GRADE } = await import(
    "../../toss-shop/lib/seller-engine/winner-sku-engine.ts"
  );
  // 3건만 팔렸지만 건당 금액이 큰 SKU — 크기만 보면 효자로 오인된다
  const rows = [
    settlement("a1", "2026-08-01", "대박상품", 900000),
    settlement("a2", "2026-08-02", "대박상품", 900000),
    settlement("a3", "2026-08-03", "대박상품", 900000),
  ];
  const r = analyzeWinnerSkus({ settlements: rows, goalKrw: 10_000_000 });
  const sku = r.skus[0];
  assert.equal(sku.grade, "insufficient_data", "3건으로 효자 판정하면 안 된다");
  assert.equal(r.heroes.length, 0);
  assert.ok(MIN_ORDERS_FOR_GRADE > 3);
});

test("winner engine: 크고 꾸준한 SKU만 효자가 된다", async () => {
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  // 30일간 매일 20,000원 → 월 60만원 = 목표 1,000만원의 6%
  const rows = steadySales("효자상품", 30, 20000);
  const r = analyzeWinnerSkus({ settlements: rows, goalKrw: 10_000_000 });
  const sku = r.skus[0];
  assert.equal(sku.grade, "hero", `효자여야 하는데 ${sku.grade} (${sku.reason})`);
  assert.ok(sku.monthlyNetKrw >= 500000);
  assert.ok(sku.consistencyScore >= 90, "매일 팔렸으므로 꾸준함이 높아야");
  assert.equal(r.heroes.length, 1);
  assert.ok(r.actualMonthlyNetKrw > 0);
});

test("winner engine: 꺾인 SKU는 크기와 무관하게 하락으로 잡는다", async () => {
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  // 전반 15일은 잘 팔리다 후반 15일에 급감
  const strong = steadySales("하락상품", 15, 40000, 1);
  const weak = steadySales("하락상품", 15, 3000, 16).map((r, i) => ({ ...r, id: `w${i}`, orderId: `w${i}` }));
  const r = analyzeWinnerSkus({ settlements: [...strong, ...weak], goalKrw: 10_000_000 });
  const sku = r.skus[0];
  assert.ok(sku.trendPct <= -30, `추세가 크게 꺾여야: ${sku.trendPct}%`);
  assert.equal(sku.grade, "declining");
  assert.equal(r.heroes.length, 0, "꺾인 SKU는 효자가 아니다");
});

test("winner engine: 기여도 낮은 SKU는 정리대상으로 분류된다", async () => {
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  // 30일간 매일 100원 → 월 3,000원, 목표의 0.03%
  const r = analyzeWinnerSkus({ settlements: steadySales("소액상품", 30, 100), goalKrw: 10_000_000 });
  assert.equal(r.skus[0].grade, "drain");
  assert.equal(r.drains.length, 1);
  assert.ok(r.nextActions.some((a) => a.includes("정리대상")));
});

test("winner engine: 파레토와 목표까지 필요한 효자 수를 실측으로 낸다", async () => {
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  const rows = [
    ...steadySales("효자A", 30, 25000),
    ...steadySales("효자B", 30, 20000),
    ...steadySales("소액C", 30, 300),
    ...steadySales("소액D", 30, 200),
    ...steadySales("소액E", 30, 100),
  ];
  const r = analyzeWinnerSkus({ settlements: rows, goalKrw: 10_000_000 });
  assert.equal(r.heroes.length, 2);
  assert.ok(r.paretoTopSharePct >= 50, `상위 20%가 대부분을 만들어야: ${r.paretoTopSharePct}%`);
  // 아직 목표 미달이므로 추가 효자가 필요하다고 계산되어야 한다
  assert.ok(r.actualMonthlyNetKrw < 10_000_000);
  assert.ok(r.heroesNeededForGoal > 0);
  assert.match(r.brief, /효자 \d+개 더 필요/);
});

// ── 광고비 배분: 실측 효자에만, 손익분기 상한 준수 ─────────────────────

test("ad allocator: 검증 안 된 SKU에는 예산을 태우지 않는다", async () => {
  const { allocateAdBudget } = await import("../../toss-shop/lib/seller-engine/ad-budget-allocator.ts");
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  // 표본 부족 SKU만 존재
  const winners = analyzeWinnerSkus({
    settlements: [settlement("x1", "2026-08-01", "신상품", 5000)],
    goalKrw: 10_000_000,
  });
  const plan = allocateAdBudget({
    totalDailyBudgetKrw: 50000,
    winners,
    candidates: [
      { productName: "신상품", priceKrw: 20000, grossMarginKrw: 6000, conversionRatePct: 3, alreadyFeeFree: false },
    ],
  });
  assert.equal(plan.allocatedDailyKrw, 0, "실판매 미검증 SKU에 태우면 예측 오차에 돈을 거는 것");
  assert.equal(plan.paused.length, 1);
  assert.match(plan.paused[0].reason, /표본 부족/);
  assert.ok(plan.warnings.length > 0);
});

test("ad allocator: 효자에 예산이 집중되고 손익분기 CPC를 넘지 않는다", async () => {
  const { allocateAdBudget } = await import("../../toss-shop/lib/seller-engine/ad-budget-allocator.ts");
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  const winners = analyzeWinnerSkus({
    settlements: [...steadySales("효자상품", 30, 20000), ...steadySales("소액상품", 30, 100)],
    goalKrw: 10_000_000,
  });
  const plan = allocateAdBudget({
    totalDailyBudgetKrw: 50000,
    winners,
    candidates: [
      { productName: "효자상품", priceKrw: 20000, grossMarginKrw: 6000, conversionRatePct: 4, alreadyFeeFree: false },
      { productName: "소액상품", priceKrw: 20000, grossMarginKrw: 6000, conversionRatePct: 4, alreadyFeeFree: false },
    ],
  });
  const hero = plan.allocations.find((a) => a.productName === "효자상품");
  assert.ok(hero, "효자에 배분되어야");
  assert.equal(hero.grade, "hero");
  assert.equal(hero.action, "scale");
  // 손익분기 CPC = 판매가 × 8% × 전환율 = 20000 × 0.08 × 0.04 = 64
  assert.equal(hero.maxCpcKrw, 64);
  assert.equal(hero.economics.feeSavedPerSaleKrw, 1600);
  // 정리대상에는 한 푼도 안 간다
  assert.ok(!plan.allocations.some((a) => a.productName === "소액상품"));
  assert.ok(plan.paused.some((p) => p.productName === "소액상품"));
});

test("ad allocator: 이미 수수료 0%인 SKU는 광고 중복 효과가 없어 비중을 낮춘다", async () => {
  const { allocateAdBudget } = await import("../../toss-shop/lib/seller-engine/ad-budget-allocator.ts");
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  const winners = analyzeWinnerSkus({
    settlements: steadySales("효자상품", 30, 20000),
    goalKrw: 10_000_000,
  });
  const plan = allocateAdBudget({
    totalDailyBudgetKrw: 50000,
    winners,
    candidates: [
      { productName: "효자상품", priceKrw: 20000, grossMarginKrw: 6000, conversionRatePct: 4, alreadyFeeFree: true },
    ],
  });
  const a = plan.allocations[0];
  assert.equal(a.action, "reduce");
  assert.equal(a.economics.feeSavedPerSaleKrw, 0, "면제할 수수료가 없다");
  assert.ok(a.dailyBudgetKrw < 50000 * 0.5, "비중이 크게 낮아져야");
  assert.match(a.reason, /중복되지 않아/);
});

test("ad allocator: 전환율 실측이 없으면 배분을 보류한다", async () => {
  const { allocateAdBudget } = await import("../../toss-shop/lib/seller-engine/ad-budget-allocator.ts");
  const { analyzeWinnerSkus } = await import("../../toss-shop/lib/seller-engine/winner-sku-engine.ts");
  const winners = analyzeWinnerSkus({
    settlements: steadySales("효자상품", 30, 20000),
    goalKrw: 10_000_000,
  });
  const plan = allocateAdBudget({
    totalDailyBudgetKrw: 50000,
    winners,
    candidates: [
      { productName: "효자상품", priceKrw: 20000, grossMarginKrw: 6000, alreadyFeeFree: false },
    ],
  });
  assert.equal(plan.allocatedDailyKrw, 0);
  assert.match(plan.paused[0].reason, /전환율 실측 없음/);
});

// ── 도매처 어댑터: 미검증 플랫폼은 소싱에 참여하지 않는다 ───────────────

test("wholesale adapters: 스펙 미확보 플랫폼은 검색에 참여하지 않는다", async () => {
  const { listAdapters, liveAdapters, adapterHealth, searchAllWholesale } = await import(
    "../../toss-shop/lib/wholesale/adapters/registry.ts"
  );
  const all = listAdapters();
  assert.ok(all.length >= 4, "도매꾹 외 확장 후보가 등록되어야");

  const pending = adapterHealth().filter((a) => a.status === "needs_spec");
  assert.ok(pending.length > 0);
  // needs_spec 어댑터는 search 자체가 없어야 한다 — 추정 데이터를 만들 수 없다
  for (const a of all.filter((x) => x.status() === "needs_spec")) {
    assert.equal(a.search, undefined, `${a.label}: 스펙 미확보인데 search가 있으면 추측 데이터가 샌다`);
    assert.ok(a.specNote, `${a.label}: 활성화에 필요한 것이 명시되어야`);
  }

  // 키 없으면 live 어댑터가 없고, 검색은 빈 결과 + skipped 사유를 준다
  const prevKey = process.env.DOMEGGOOK_API_KEY;
  delete process.env.DOMEGGOOK_API_KEY;
  assert.equal(liveAdapters().length, 0);
  const res = await searchAllWholesale("테스트", 5);
  assert.equal(res.listings.length, 0, "미연동 상태에서 추정 상품을 만들면 안 된다");
  assert.ok(res.skipped.length > 0);
  if (prevKey) process.env.DOMEGGOOK_API_KEY = prevKey;
});

// ── 채널 모드: 수입판매 격리 ──────────────────────────────────────────

test("channel mode: 수입판매는 기본 비활성 (가짜 원가 노출 차단)", async () => {
  const { isImportSalesEnabled, activeChannelLabel } = await import(
    "../../toss-shop/lib/seller-engine/channel-mode.ts"
  );
  const prev = process.env.TOSS_SHOP_IMPORT_SALES_ENABLED;
  delete process.env.TOSS_SHOP_IMPORT_SALES_ENABLED;
  assert.equal(isImportSalesEnabled(), false);
  assert.match(activeChannelLabel(), /위탁 전용/);

  process.env.TOSS_SHOP_IMPORT_SALES_ENABLED = "true";
  assert.equal(isImportSalesEnabled(), true);

  if (prev === undefined) delete process.env.TOSS_SHOP_IMPORT_SALES_ENABLED;
  else process.env.TOSS_SHOP_IMPORT_SALES_ENABLED = prev;
});

// ── 접근 제어: 내 계정만 무료 ─────────────────────────────────────────
// 이 테스트들은 수익 모델 자체를 지킨다. 깨지면 아무나 무료로 쓰거나,
// 남이 오너의 토스 상점을 조작할 수 있다는 뜻이다.

test("access: 만료일 없는 pro는 영구 무료가 되지 않는다", async () => {
  const { getPlanAccess } = await import("../../toss-shop/lib/billing.ts");
  // 종전에는 plan==="pro" && !proExpiresAt 이면 만료 없이 fullAccess였다
  const forever = getPlanAccess({ email: "stranger@example.com", plan: "pro" });
  assert.equal(forever.fullAccess, false, "만료일 없는 pro는 free로 강등되어야");
  assert.equal(forever.tier, "free");

  const expired = getPlanAccess({
    email: "stranger@example.com", plan: "pro", proExpiresAt: "2020-01-01T00:00:00.000Z",
  });
  assert.equal(expired.fullAccess, false, "만료된 pro는 차단");

  // 실제로 돈을 낸 사람은 막히면 안 된다
  const valid = getPlanAccess({
    email: "payer@example.com", plan: "pro", proExpiresAt: "2099-01-01T00:00:00.000Z",
  });
  assert.equal(valid.fullAccess, true);
  const subscriber = getPlanAccess({
    email: "payer@example.com", plan: "pro", subscriptionStatus: "active",
  });
  assert.equal(subscriber.fullAccess, true);
});

test("access: 오너만 무제한, 나머지는 free", async (t) => {
  const { getPlanAccess, isOwnerEmail } = await import("../../toss-shop/lib/billing.ts");
  const prev = process.env.TOSS_SHOP_OWNER_EMAILS;
  t.after(() => {
    if (prev === undefined) delete process.env.TOSS_SHOP_OWNER_EMAILS;
    else process.env.TOSS_SHOP_OWNER_EMAILS = prev;
  });
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";

  assert.equal(isOwnerEmail("owner@example.com"), true);
  assert.equal(isOwnerEmail("OWNER@example.com"), true, "대소문자 무관");
  assert.equal(isOwnerEmail("owner@example.com.evil.com"), false, "부분일치로 뚫리면 안 됨");
  assert.equal(isOwnerEmail("notowner@example.com"), false);

  assert.equal(getPlanAccess({ email: "owner@example.com", plan: "free" }).fullAccess, true);
  assert.equal(getPlanAccess({ email: "stranger@example.com", plan: "free" }).fullAccess, false);
});

test("access: 오너 아닌 계정은 환경변수 토스 API 키를 상속받지 못한다", async (t) => {
  const { resolveApiConfig } = await import("../../toss-shop/lib/api/client.ts");
  const prevOwner = process.env.TOSS_SHOP_OWNER_EMAILS;
  const prevKey = process.env.TOSS_SHOPPING_ACCESS_KEY;
  const prevSecret = process.env.TOSS_SHOPPING_SECRET_KEY;
  t.after(() => {
    if (prevOwner === undefined) delete process.env.TOSS_SHOP_OWNER_EMAILS;
    else process.env.TOSS_SHOP_OWNER_EMAILS = prevOwner;
    if (prevKey === undefined) delete process.env.TOSS_SHOPPING_ACCESS_KEY;
    else process.env.TOSS_SHOPPING_ACCESS_KEY = prevKey;
    if (prevSecret === undefined) delete process.env.TOSS_SHOPPING_SECRET_KEY;
    else process.env.TOSS_SHOPPING_SECRET_KEY = prevSecret;
  });
  process.env.TOSS_SHOP_OWNER_EMAILS = "owner@example.com";
  process.env.TOSS_SHOPPING_ACCESS_KEY = "OWNER_LIVE_KEY";
  process.env.TOSS_SHOPPING_SECRET_KEY = "OWNER_LIVE_SECRET";

  // 남의 merchant — env 키로 폴백하면 오너 상점을 조작할 수 있다
  const stranger = await resolveApiConfig("merch_stranger", {}, "stranger@example.com");
  assert.equal(stranger, null, "남에게 오너 키가 새면 안 된다");

  // 이메일 자체가 없을 때도 폴백 금지 (호출부가 빠뜨린 경우)
  const unknown = await resolveApiConfig("merch_unknown", {});
  assert.equal(unknown, null, "소유자 미상이면 폴백 금지");

  // 오너는 정상 동작해야 한다
  const owner = await resolveApiConfig("merch_owner", {}, "owner@example.com");
  assert.ok(owner, "오너까지 막히면 안 된다");
  assert.equal(owner.accessKey, "OWNER_LIVE_KEY");

  // 자기 키를 가진 셀러는 소유자와 무관하게 자기 키를 쓴다
  const own = await resolveApiConfig("merch_self", { accessKey: "MY_KEY", secretKey: "MY_SECRET" });
  assert.equal(own.accessKey, "MY_KEY");
});

test("access: Pro 활성화 코드가 저장소에 커밋되어 있지 않다", async () => {
  const { readFileSync } = await import("node:fs");
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));
  const committed = vercel.build?.env?.TOSS_SHOP_PRO_ACTIVATION_CODE;
  assert.equal(
    committed, undefined,
    "활성화 코드가 vercel.json에 있으면 저장소를 보는 누구나 무료 Pro를 받는다",
  );
});

// ── 카테고리 자동 선택: 자비스가 분류한 상품 카테고리로 자동으로 고른다 ──
// 종전에는 TOSS_SHOP_DEFAULT_CATEGORY_ID 하나가 모든 상품에 그대로
// 적용됐다. 식품용 ID를 넣어두면 뷰티 상품도 식품으로 등록되는 셈이었다.

async function loadCategoryResolver() {
  const mod = await import("../../toss-shop/lib/api/category-resolver.ts");
  mod.clearCategoryMapCache();
  return mod;
}

function clearCategoryEnv() {
  delete process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID;
  delete process.env.TOSS_SHOP_CATEGORY_ID_MAP;
}

test("category resolver: 카테고리별 매핑이 있으면 상품 분류에 맞춰 자동 선택한다", async (t) => {
  const { resolveCategoryId } = await loadCategoryResolver();
  t.after(clearCategoryEnv);

  process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID = "999";
  process.env.TOSS_SHOP_CATEGORY_ID_MAP = JSON.stringify({ food: 111, beauty: 222, home: 333 });

  const food = resolveCategoryId({ category: "food" });
  assert.equal(food.categoryId, 111);
  assert.equal(food.source, "category_map");
  assert.equal(food.matchedCategory, "food");

  const beauty = resolveCategoryId({ category: "beauty" });
  assert.equal(beauty.categoryId, 222);

  // 매핑에 없는 카테고리(digital)는 기본값으로 폴백 + 경고
  const digital = resolveCategoryId({ category: "digital" });
  assert.equal(digital.categoryId, 999);
  assert.equal(digital.source, "default");
  assert.ok(digital.warnings.length > 0);
});

test("category resolver: 승인 화면 직접 지정이 항상 최우선", async (t) => {
  const { resolveCategoryId } = await loadCategoryResolver();
  t.after(clearCategoryEnv);
  process.env.TOSS_SHOP_CATEGORY_ID_MAP = JSON.stringify({ food: 111 });
  const d = resolveCategoryId({ category: "food", explicitCategoryId: 777 });
  assert.equal(d.categoryId, 777);
  assert.equal(d.source, "explicit");
});

test("category resolver: 매핑 JSON이 깨지면 fail-closed로 등록을 차단한다", async (t) => {
  const { resolveCategoryId, isCategoryResolved } = await loadCategoryResolver();
  t.after(clearCategoryEnv);
  process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID = "999";
  for (const broken of ["{not-json", '{"food":"식품"}', '{"unknown_category":123}']) {
    const { clearCategoryMapCache } = await import("../../toss-shop/lib/api/category-resolver.ts");
    process.env.TOSS_SHOP_CATEGORY_ID_MAP = broken;
    clearCategoryMapCache();
    const d = resolveCategoryId({ category: "food" });
    assert.equal(isCategoryResolved(d), false, `${broken} 는 차단돼야 함`);
    assert.equal(d.error.code, "MAP_INVALID");
  }
});

test("category resolver: 기본값도 매핑도 없으면 MISSING", async (t) => {
  const { resolveCategoryId } = await loadCategoryResolver();
  t.after(clearCategoryEnv);
  clearCategoryEnv();
  const d = resolveCategoryId({ category: "food" });
  assert.equal(d.error.code, "MISSING");
});

test("category resolver: 매핑 없이 기본값 하나만 있으면 전 카테고리 동일 적용", async (t) => {
  const { resolveCategoryId } = await loadCategoryResolver();
  t.after(clearCategoryEnv);
  process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID = "500";
  assert.equal(resolveCategoryId({ category: "food" }).categoryId, 500);
  assert.equal(resolveCategoryId({ category: "digital" }).categoryId, 500);
});

test("publish: 카테고리 매핑으로 상품 종류에 맞는 카테고리 ID가 실제 등록에 쓰인다", async (t) => {
  const { publishListingToToss } = await import("../../toss-shop/lib/api/create-product.ts");
  const { clearCategoryMapCache } = await loadCategoryResolver();
  const realFetch = globalThis.fetch;
  t.after(() => {
    clearCategoryEnv();
    delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID;
    clearCategoryMapCache();
    globalThis.fetch = realFetch;
  });

  process.env.TOSS_SHOP_CATEGORY_ID_MAP = JSON.stringify({ beauty: 8080 });
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  clearCategoryMapCache();

  let sentCategoryId;
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    const reqMock = mockTossRequirements(href);
    if (reqMock) return reqMock;
    if (href.includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    const body = JSON.parse(opts.body);
    sentCategoryId = body.categoryId;
    return new Response(JSON.stringify({ resultType: "SUCCESS", success: { id: 1 } }), { status: 200 });
  };

  const draft = {
    pickMode: "consignment",
    keyword: "립스틱",
    // 토스는 이미지 없는 상품을 거절한다 — 실제 등록 경로를 태우는 테스트는
    // 공급처 실사진이 있는 상태여야 한다
    detailPage: { thumbnailUrl: "https://img.example/thumb.jpg" },
    listingPayload: {
      name: "테스트 립스틱",
      brandName: "에피로드",
      salePrice: 15000,
      originPrice: 16000,
      searchKeywords: ["립스틱"],
      description: "설명",
      categoryHint: "뷰티",
      category: "beauty",
      deliveryFeeType: "FREE",
      returnHandling: "seller_handles",
    },
  };

  const res = await publishListingToToss({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    draft,
  });

  assert.equal(res.ok, true);
  assert.equal(sentCategoryId, 8080, "뷰티 상품이 뷰티 카테고리 ID로 등록되어야");
  assert.equal(res.category.matchedCategory, "beauty");
});

// ── 토스 카테고리·반품지 조회: 실제 응답 필드명 미확인 → 방어적 판독 ────
// 이 두 엔드포인트는 공개 문서 색인에서 존재를 확인했지만(네트워크 제한으로
// 문서 원문은 못 봄), 정확한 응답 필드명(id/name/isLeaf 등)은 검증되지
// 않았다. 그래서 후보 필드 여러 개를 시도하는 방어적 판독을 쓴다 — 실제
// 응답을 받아보면 이 테스트의 mock 형태를 진짜 스키마로 교체해야 한다.

test("category lookup: id/name/isLeaf 후보 필드를 방어적으로 판독한다", async (t) => {
  const { listTossCategories } = await import("../../toss-shop/lib/api/category-lookup.ts");
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });

  globalThis.fetch = async (url) => {
    const href = String(url);
    const reqMock = mockTossRequirements(href);
    if (reqMock) return reqMock;
    if (href.includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        resultType: "SUCCESS",
        success: {
          items: [
            { id: 100, name: "식품", isLeaf: false },
            { categoryId: 101, categoryName: "과일", leaf: true },
            { id: 102, name: "고기", hasChildren: false },
          ],
        },
      }),
      { status: 200 },
    );
  };

  const { nodes } = await listTossCategories("m1", { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" });
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].isLeaf, false);
  assert.equal(nodes[1].id, 101, "categoryId 후보 필드도 판독되어야");
  assert.equal(nodes[1].isLeaf, true);
  assert.equal(nodes[2].isLeaf, true, "hasChildren:false 는 리프로 해석되어야");
});

test("category lookup: 판독 불가능한 항목은 조용히 걸러진다 (에러로 죽지 않음)", async (t) => {
  const { listTossCategories } = await import("../../toss-shop/lib/api/category-lookup.ts");
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url) => {
    if (String(url).includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({ resultType: "SUCCESS", success: { items: [{ noIdField: true }, null, "junk"] } }),
      { status: 200 },
    );
  };
  const { nodes } = await listTossCategories("m1", { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" });
  assert.equal(nodes.length, 0);
});

test("return location lookup: id/name/address 후보 필드를 방어적으로 판독한다", async (t) => {
  const { listTossReturnLocations } = await import("../../toss-shop/lib/api/return-location-lookup.ts");
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url) => {
    if (String(url).includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        resultType: "SUCCESS",
        success: { locations: [{ id: 678, name: "본사창고", address: "서울시 어딘가" }] },
      }),
      { status: 200 },
    );
  };
  const { locations } = await listTossReturnLocations("m1", { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" });
  assert.equal(locations.length, 1);
  assert.equal(locations[0].id, 678);
  assert.equal(locations[0].name, "본사창고");
  assert.equal(locations[0].address, "서울시 어딘가");
});

test("return location lookup: 등록된 반품지가 없으면 빈 배열 (에러 아님)", async (t) => {
  const { listTossReturnLocations } = await import("../../toss-shop/lib/api/return-location-lookup.ts");
  const realFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  globalThis.fetch = async (url) => {
    if (String(url).includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify({ resultType: "SUCCESS", success: { locations: [] } }), { status: 200 });
  };
  const { locations } = await listTossReturnLocations("m1", { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" });
  assert.deepEqual(locations, []);
});

// ── 반품지 오배정 방지 ────────────────────────────────────────────────
// 셀러가 예전에 A공급처 상품을 팔며 A의 주소를 반품지로 등록해뒀다면,
// 그게 기본 반품지가 되어 이후 B·C·D 공급처 상품이 전부 A 주소로 반품된다.
// A는 남의 물건이라 수취 거부 → 미아 → 분쟁 → 페널티.

test("return policy: 공급처 직접수거 / 셀러 처리 / 반품불가를 판독한다", async () => {
  const { readSupplierReturnPolicy, canUseSellerOwnedReturnLocation, isReturnPolicyDisqualifying } =
    await import("../../toss-shop/lib/wholesale/supplier-return-policy.ts");

  const collects = readSupplierReturnPolicy("반품 시 공급사에서 직접 수거합니다. 고객센터로 접수해주세요.");
  assert.equal(collects.handling, "supplier_collects");
  assert.equal(collects.verified, true);
  assert.equal(canUseSellerOwnedReturnLocation(collects), false, "공급처 수거형은 셀러 주소 쓰면 왕복비 손실");

  const seller = readSupplierReturnPolicy("반품은 판매자가 직접 처리해주셔야 합니다.");
  assert.equal(seller.handling, "seller_handles");
  assert.equal(canUseSellerOwnedReturnLocation(seller), true);

  const refused = readSupplierReturnPolicy("단순 변심에 의한 반품 불가 상품입니다.");
  assert.equal(refused.handling, "refused");
  assert.equal(isReturnPolicyDisqualifying(refused), true, "반품 불가 공급처는 소싱 제외");
});

test("return policy: 판독 실패는 unknown (추측으로 셀러 주소를 쓰지 않는다)", async () => {
  const { readSupplierReturnPolicy, canUseSellerOwnedReturnLocation } = await import(
    "../../toss-shop/lib/wholesale/supplier-return-policy.ts"
  );
  for (const text of [undefined, "", "고급 원단으로 제작된 상품입니다."]) {
    const p = readSupplierReturnPolicy(text);
    assert.equal(p.handling, "unknown");
    assert.equal(p.verified, false);
    assert.equal(canUseSellerOwnedReturnLocation(p), false);
  }
  // 양쪽 신호가 섞이면 판독 불가로 남긴다
  const mixed = readSupplierReturnPolicy("공급사에서 직접 수거하며, 반품은 판매자가 처리합니다.");
  assert.equal(mixed.handling, "unknown");
});

test("return location: 성격 미상 기본 반품지는 사용을 차단한다 (남의 주소일 수 있음)", async (t) => {
  const { resolveReturnLocation, isReturnLocationResolved, clearReturnLocationMapCache } =
    await import("../../toss-shop/lib/api/exchange-return-location.ts");
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
  });
  clearReturnLocationEnv();
  clearReturnLocationMapCache();

  // 예전 A공급처 주소가 기본 반품지로 남아 있는 상황
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "111";

  const d = resolveReturnLocation({
    supplierPlatform: "domeggook",
    supplierId: "B공급처",
    pickMode: "consignment",
    returnHandling: "unknown",
  });
  assert.equal(isReturnLocationResolved(d), false, "성격 미상 기본값으로 등록하면 안 된다");
  assert.equal(d.error.code, "SUPPLIER_ADDRESS_REQUIRED");
  assert.match(d.error.message, /예전 공급처 주소라면/);
});

test("return location: 셀러 자체 주소로 선언하면 폴백이 허용된다", async (t) => {
  const { resolveReturnLocation, isReturnLocationResolved, clearReturnLocationMapCache } =
    await import("../../toss-shop/lib/api/exchange-return-location.ts");
  t.after(() => {
    clearReturnLocationEnv();
    delete process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED;
    clearReturnLocationMapCache();
  });
  clearReturnLocationEnv();
  clearReturnLocationMapCache();

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "111";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";

  // 셀러 처리형 → 깨끗하게 통과
  const clean = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "s1",
    pickMode: "consignment", returnHandling: "seller_handles",
  });
  assert.equal(clean.locationId, 111);
  assert.equal(clean.warnings.length, 0);

  // 판독 실패(unknown) → 셀러 주소로 등록은 되지만 왕복비 경고
  const unknownFallback = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "s2",
    pickMode: "consignment", returnHandling: undefined,
  });
  assert.equal(isReturnLocationResolved(unknownFallback), true);
  assert.ok(unknownFallback.warnings.some((w) => w.includes("반품 처리 주체가 확인되지 않아")));

  // 공급처 직접수거로 확인됐지만 전용 주소가 없다 → 사장님 지시로 소싱을
  // 막지 않는다. 셀러 주소로 강제 폴백하고, 재발송 가능성을 경고로만 남긴다.
  // (비용은 return-logistics-brain.ts가 별도로 충당금으로 계산한다)
  const collects = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "s3",
    pickMode: "consignment", returnHandling: "supplier_collects",
  });
  assert.equal(isReturnLocationResolved(collects), true, "반품지 없다고 등록을 막으면 안 된다");
  assert.equal(collects.locationId, 111);
  assert.ok(collects.warnings.some((w) => w.includes("재발송")));
});

test("return location: seller_default 매핑 키로도 셀러 주소를 선언할 수 있다", async (t) => {
  const { resolveReturnLocation, clearReturnLocationMapCache } = await import(
    "../../toss-shop/lib/api/exchange-return-location.ts"
  );
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
  });
  clearReturnLocationEnv();
  clearReturnLocationMapCache();

  // 공급처 전용 주소 + 셀러 자체 주소를 한 매핑에 선언
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({
    "domeggook:A공급처": 201,
    seller_default: 999,
  });
  clearReturnLocationMapCache();

  // A공급처 상품 → 전용 주소
  const a = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "A공급처",
    pickMode: "consignment", returnHandling: "supplier_collects",
  });
  assert.equal(a.locationId, 201, "A공급처는 자기 주소로");

  // 매핑에 없는 B공급처(셀러 처리형) → seller_default로 안전하게 폴백
  const b = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "B공급처",
    pickMode: "consignment", returnHandling: "seller_handles",
  });
  assert.equal(b.locationId, 999, "A의 주소가 아니라 셀러 자체 주소로");
});

test("return location: 매핑은 있으나 공급처 전용 주소가 없으면 차단한다", async (t) => {
  const { resolveReturnLocation, isReturnLocationResolved, clearReturnLocationMapCache } =
    await import("../../toss-shop/lib/api/exchange-return-location.ts");
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
  });
  clearReturnLocationEnv();
  clearReturnLocationMapCache();

  // A공급처만 매핑됨, seller_default 선언 없음
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({ "domeggook:A공급처": 201 });
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "111";
  clearReturnLocationMapCache();

  const d = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "B공급처",
    pickMode: "consignment", returnHandling: "supplier_collects",
  });
  assert.equal(isReturnLocationResolved(d), false, "B의 반품이 A 주소로 가면 안 된다");
  assert.equal(d.error.code, "SUPPLIER_ADDRESS_REQUIRED");
});

// ── 멀티컷 스튜디오 + 프리미엄 상세 ──────────────────────────────────

test("shot set: 컷마다 다른 촬영 지시를 쓰되 회전은 절대 지시하지 않는다", async (t) => {
  const { buildProductShotSet } = await import("../../toss-shop/lib/seller-engine/product-shot-set.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  const realFetch = globalThis.fetch;
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
    globalThis.fetch = realFetch;
    delete process.env.JARVIS_SHOT_KINDS;
  });

  // 512바이트 미만 이미지는 ai-image-studio가 걸러내므로 충분한 크기로 만든다
  const bigPng = Buffer.concat([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
    Buffer.alloc(1024, 0),
  ]);
  const tiny = bigPng.toString("base64");
  const prompts = [];
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    if (href.includes("images/edits")) {
      for (const [k, v] of opts.body.entries()) if (k === "prompt") prompts.push(v);
      return new Response(JSON.stringify({ data: [{ b64_json: tiny }] }), { status: 200 });
    }
    return new Response(bigPng, { status: 200, headers: { "Content-Type": "image/png" } });
  };

  process.env.JARVIS_SHOT_KINDS = "hero,detail,lifestyle";
  const result = await buildProductShotSet({
    imageUrl: "https://supplier.example/p.jpg",
    category: "beauty",
    productLabel: "세럼",
  });

  assert.equal(result.shots.length, 3, "3컷이 생성되어야");
  assert.deepEqual(result.shots.map((s) => s.kind), ["hero", "detail", "lifestyle"]);
  assert.ok(result.shots.every((s) => s.caption.length > 0), "컷마다 캡션이 있어야");

  // 컷마다 지시가 실제로 달라야 "다른 스튜디오에서 찍은 것"처럼 보인다
  assert.equal(new Set(prompts).size, 3, "컷마다 프롬프트가 달라야");

  // 그런데 어떤 컷도 회전·뒷면을 지시하면 안 된다 (없는 면을 지어내면 허위표시)
  for (const p of prompts) {
    assert.doesNotMatch(p, /rotate the product|show the back|from behind|opposite side/i);
    assert.match(p, /same viewing side/i, "보이는 면 유지 지시가 있어야");
    assert.match(p, /faithful to the input image/i, "형태 보존 제약이 매 컷에 걸려야");
  }
});

test("shot set: 원본 없음·AI 비활성이면 조용히 건너뛴다 (등록을 막지 않는다)", async (t) => {
  const { buildProductShotSet } = await import("../../toss-shop/lib/seller-engine/product-shot-set.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
  });

  delete process.env.OPENAI_API_KEY;
  const noKey = await buildProductShotSet({ imageUrl: "https://x/p.jpg", category: "home", productLabel: "선반" });
  assert.equal(noKey.shots.length, 0);
  assert.ok(noKey.skipped.length > 0, "건너뛴 이유가 남아야");

  process.env.OPENAI_API_KEY = "sk-test-mock";
  const noImage = await buildProductShotSet({ imageUrl: undefined, category: "home", productLabel: "선반" });
  assert.equal(noImage.shots.length, 0);
  assert.match(noImage.skipped[0].reason, /원본 이미지 없음/);
});

test("premium detail: 카테고리별 톤과 멀티컷 캡션이 반영된다", async () => {
  const { buildPremiumDetailHtml } = await import(
    "../../toss-shop/lib/seller-engine/premium-detail-template.ts"
  );
  const html = buildPremiumDetailHtml({
    title: "수분 세럼 30ml",
    keyword: "세럼",
    priceKrw: 19000,
    originPriceKrw: 25000,
    category: "beauty",
    sellingPoints: ["저자극 테스트 완료", "펌프형 용기"],
    description: "건조한 피부에 수분을 채웁니다. 아침저녁으로 사용하세요.",
    shots: [
      { kind: "hero", url: "https://x/1.jpg", caption: "정면 스튜디오 컷" },
      { kind: "detail", url: "https://x/2.jpg", caption: "디테일 클로즈업" },
    ],
    deliveryNote: "평일 기준 당일 출고됩니다.",
    returnNote: "반품은 공급처에서 직접 수거합니다.",
  });

  assert.match(html, /수분 세럼 30ml/);
  assert.match(html, /데일리 뷰티/, "뷰티 카테고리 톤이 적용되어야");
  assert.match(html, /디테일 클로즈업/, "컷 캡션이 노출되어야");
  assert.match(html, /24%/, "할인율이 계산되어야");
  assert.match(html, /평일 기준 당일 출고/, "배송 안내는 사실만");
  assert.match(html, /공급처에서 직접 수거/, "반품 안내는 판독된 사실만");
});

test("premium detail: 근거 없는 최상급 표현을 넣지 않는다", async () => {
  const { buildPremiumDetailHtml } = await import(
    "../../toss-shop/lib/seller-engine/premium-detail-template.ts"
  );
  const html = buildPremiumDetailHtml({
    title: "테스트 상품", keyword: "테스트", priceKrw: 10000,
    category: "home", sellingPoints: ["포인트"], description: "설명",
    fallbackImages: ["https://x/1.jpg"],
  });
  // 토스 정책상 실증 없는 최상급·배타성 표현은 제재 대상이다
  for (const banned of ["최고급", "업계 1위", "최저가", "유일한", "100% 보장"]) {
    assert.ok(!html.includes(banned), `"${banned}" 같은 근거 없는 표현이 있으면 안 된다`);
  }
});

test("premium detail: XSS — 상품명·설명이 이스케이프된다", async () => {
  const { buildPremiumDetailHtml } = await import(
    "../../toss-shop/lib/seller-engine/premium-detail-template.ts"
  );
  const html = buildPremiumDetailHtml({
    title: '<script>alert(1)</script>', keyword: "x", priceKrw: 1000,
    category: "home", sellingPoints: ['<img onerror=alert(1)>'],
    description: '"><script>bad()</script>',
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("<img onerror"));
  assert.match(html, /&lt;script&gt;/);
});

// ── 확실성 게이트: 추정치로는 통과 못 한다 ────────────────────────────

function certainPick(overrides = {}) {
  return {
    id: "p1", keyword: "테스트", productName: "상품", suggestedTitle: "상품",
    category: "home", supplierCostKrw: 12000, recommendedPriceKrw: 20000,
    competitorPrices: [], searchVolume: 5000, competitionIntensity: 1.0,
    estimatedMarginPct: 20, estimatedDailyProfitKrw: 15000,
    estimatedMonthlyProfitKrw: 450000, confidenceScore: 90, reason: "",
    catalogStrategy: { mode: "avoid_catalog" },
    riskPlaybook: { criticalCount: 0, blockCount: 0 },
    wholesaleBest: {
      platform: "domeme", title: "공급상품", unitPriceKrw: 12000, shippingFeeKrw: 0,
      moq: 1, url: "https://x", freeShipping: true, source: "live",
      sellerId: "s1", sellerNick: "공급사",
      supplierQuality: {
        grade: "excellent", shipSpeed: "same_day", verified: true,
        fulfillmentRatePct: 99, readFrom: ["grade"], reason: "우수·당일발송·정상출고 99%",
      },
      policyText: "반품은 판매자가 직접 처리해주셔야 합니다.",
    },
    ...overrides,
  };
}

test("certainty: 실측 근거가 모두 갖춰지면 확실로 판정한다", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick());
  assert.equal(v.certain, true, v.reason);
  assert.equal(v.blockers.length, 0);
});

test("certainty: 공급처가 추정이면 점수와 무관하게 탈락한다", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const pick = certainPick({
    wholesaleBest: { ...certainPick().wholesaleBest, source: "estimated" },
  });
  const v = evaluateCertainty(pick);
  assert.equal(v.certain, false);
  assert.match(v.reason, /추정치로는 돈을 걸 수 없다|미달/);
});

test("certainty: 공급처 등급이 미확인이어도 나머지가 확실하면 통과한다", async () => {
  // 도매꾹 API가 등급 필드를 안 주는 공급처가 대부분이다. 예전엔 이것만으로
  // 마진·반품정책이 멀쩡한 상품도 통째로 탈락했다 — 오늘출발을 약속 못 한다는
  // 이유로 소싱 자체를 막은 것이다. 이제는 "모른다"와 "위험하다"를 구분해,
  // 모르는 경우는 통과시키고(오늘출발만 약속하지 않는다) 확인된 위험만 막는다.
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick({
    wholesaleBest: { ...certainPick().wholesaleBest, supplierQuality: undefined },
  }));
  assert.equal(v.certain, true, "등급 미확인만으로 소싱을 막으면 안 된다");
});

test("certainty: 출고율이 실측으로 위험하게 나오면 여전히 탈락시킨다", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick({
    wholesaleBest: {
      ...certainPick().wholesaleBest,
      supplierQuality: {
        grade: "normal", shipSpeed: "next_day", verified: true,
        fulfillmentRatePct: 55, readFrom: ["shipRate"], reason: "출고율 55% — 불안정",
      },
    },
  }));
  assert.equal(v.certain, false, "실측된 위험 신호는 미확인과 다르게 취급해야");
  assert.ok(v.blockers.some((b) => b.includes("위험 신호")));
});

test("certainty: 반품 불가 공급처는 소싱에서 제외한다", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick({
    wholesaleBest: {
      ...certainPick().wholesaleBest,
      policyText: "단순 변심에 의한 반품 불가 상품입니다.",
    },
  }));
  assert.equal(v.certain, false);
  assert.ok(v.blockers.some((b) => b.includes("반품")));
});

test("certainty: 목표 기여가 작으면 탈락한다 (22개 채워도 목표 미달)", async () => {
  const { evaluateCertainty, MIN_MONTHLY_PROFIT_KRW } = await import(
    "../../toss-shop/lib/seller-engine/certainty-gate.ts"
  );
  const v = evaluateCertainty(certainPick({ estimatedMonthlyProfitKrw: MIN_MONTHLY_PROFIT_KRW - 1 }));
  assert.equal(v.certain, false);
  assert.ok(v.blockers.some((b) => b.includes("월 기여")));
});

test("certainty: 카탈로그를 못 뚫으면 탈락한다 (올려도 노출 없음)", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick({
    catalogStrategy: { mode: "win_representative" },
    catalogWin: { representativeItemScore: 30 },
  }));
  assert.equal(v.certain, false);
  assert.ok(v.blockers.some((b) => b.includes("카탈로그")));
});

test("certainty: MOQ가 1을 넘으면 위탁이 아니라 탈락한다", async () => {
  const { evaluateCertainty } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const v = evaluateCertainty(certainPick({
    wholesaleBest: { ...certainPick().wholesaleBest, moq: 10 },
  }));
  assert.equal(v.certain, false);
  assert.ok(v.blockers.some((b) => b.includes("개당 발주")));
});

test("certainty: 개수를 채우려고 기준을 낮추지 않는다", async () => {
  const { filterCertainPicks } = await import("../../toss-shop/lib/seller-engine/certainty-gate.ts");
  const picks = [
    certainPick({ id: "ok1" }),
    certainPick({ id: "bad1", estimatedMarginPct: 5 }),
    certainPick({ id: "bad2", wholesaleBest: { ...certainPick().wholesaleBest, source: "estimated" } }),
  ];
  const { certain, rejected } = filterCertainPicks(picks);
  assert.equal(certain.length, 1, "확실한 것만 통과");
  assert.equal(rejected.length, 2);
  assert.equal(certain[0].id, "ok1");
});

test("certainty: 목표까지 필요한 SKU 수를 실제 기여로 역산한다", async () => {
  const { skusNeededForGoal, MIN_MONTHLY_PROFIT_KRW } = await import(
    "../../toss-shop/lib/seller-engine/certainty-gate.ts"
  );
  // 목표 1,000만 · 현재 0 · SKU당 50만 → 20개
  assert.equal(skusNeededForGoal({ goalKrw: 10_000_000, currentMonthlyKrw: 0, avgMonthlyPerSkuKrw: 500_000 }), 20);
  // 이미 목표 달성이면 0개
  assert.equal(skusNeededForGoal({ goalKrw: 10_000_000, currentMonthlyKrw: 12_000_000 }), 0);
  // 실측 평균이 없으면 최소 기여 기준으로 역산
  assert.equal(
    skusNeededForGoal({ goalKrw: 10_000_000, currentMonthlyKrw: 0 }),
    Math.ceil(10_000_000 / MIN_MONTHLY_PROFIT_KRW),
  );
});

// ── 카테고리 자동 매칭: 상품마다 실제 트리를 내려가며 리프를 찾는다 ─────

function mockCategoryTreeFetch({ topLevelWinner = "beauty" } = {}) {
  const tree = {
    root: [
      { id: 50995, name: "식품" },
      { id: 50997, name: "뷰티" },
      { id: 22343, name: "생활용품" },
    ],
    50997: [
      { id: 51001, name: "스킨케어" },
      { id: 51002, name: "메이크업" },
    ],
    51001: [
      { id: 51101, name: "세럼/에센스", isLeaf: true },
      { id: 51102, name: "로션/크림", isLeaf: true },
    ],
  };

  return async (url, opts) => {
    const href = String(url);
    const reqMock = mockTossRequirements(href);
    if (reqMock) return reqMock;
    if (href.includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    if (href.includes("chat/completions")) {
      const body = JSON.parse(opts.body);
      const userMsg = body.messages[0].content;
      // 세럼 상품이 뷰티 > 스킨케어 > 세럼/에센스로 내려가도록, 매 단계 옵션
      // 중 그 경로에 있는 이름을 우선순위로 고르는 단순 mock.
      const priority = ["세럼/에센스", "스킨케어", "뷰티"];
      let answer = { matched: false };
      for (const name of priority) {
        const m = userMsg.match(new RegExp(`id=(\\d+): ${name}`));
        if (m) {
          answer = { id: Number(m[1]), matched: true };
          break;
        }
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }),
        { status: 200 },
      );
    }
    if (href.includes("categories/children")) {
      const u = new URL(href);
      const parentId = u.searchParams.get("id");
      const nodes = tree[parentId ?? "root"] ?? [];
      return new Response(JSON.stringify({ resultType: "SUCCESS", success: { items: nodes } }), { status: 200 });
    }
    return new Response("{}", { status: 200 });
  };
}

test("category auto-match: 실제 트리를 내려가며 리프 카테고리를 찾는다", async (t) => {
  const { autoMatchCategoryId, clearCategoryAutoMatchCache } = await import(
    "../../toss-shop/lib/api/category-auto-match.ts"
  );
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  const realFetch = globalThis.fetch;
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
    globalThis.fetch = realFetch;
    clearCategoryAutoMatchCache();
  });
  clearCategoryAutoMatchCache();
  globalThis.fetch = mockCategoryTreeFetch();

  const result = await autoMatchCategoryId({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    title: "수분 세럼 30ml",
    keyword: "세럼",
  });

  assert.equal(result.confident, true, result.reason);
  assert.equal(result.categoryId, 51101, "뷰티 > 스킨케어 > 세럼/에센스로 내려가야");
  assert.deepEqual(result.path, ["뷰티", "스킨케어", "세럼/에센스"]);
});

test("category auto-match: 모델이 트리에 없는 id를 답하면 지어낸 것으로 보고 버린다", async (t) => {
  const { autoMatchCategoryId, clearCategoryAutoMatchCache } = await import(
    "../../toss-shop/lib/api/category-auto-match.ts"
  );
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  const realFetch = globalThis.fetch;
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
    globalThis.fetch = realFetch;
    clearCategoryAutoMatchCache();
  });
  clearCategoryAutoMatchCache();

  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    const reqMock = mockTossRequirements(href);
    if (reqMock) return reqMock;
    if (href.includes("oauth2")) {
      return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
    }
    if (href.includes("chat/completions")) {
      // 존재하지 않는 id 999999를 답함 — 모델의 환각
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify({ id: 999999, matched: true }) } }] }),
        { status: 200 },
      );
    }
    if (href.includes("categories/children")) {
      return new Response(
        JSON.stringify({ resultType: "SUCCESS", success: { items: [{ id: 1, name: "식품" }] } }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 200 });
  };

  const result = await autoMatchCategoryId({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    title: "테스트 상품",
    keyword: "테스트",
  });
  assert.equal(result.confident, false, "옵션에 없는 id는 신뢰하면 안 된다");
});

test("category auto-match: 트리를 못 읽으면 카테고리를 지어내지 않는다", async (t) => {
  // 종전엔 OPENAI_API_KEY가 없으면 매칭 자체를 포기했다. 그런데 크레딧이
  // 떨어지자(429) 등록이 통째로 멈춰서, 이제 AI가 안 되면 이름 대조로
  // 실제 트리에서 고른다.
  //
  // 그래도 변하지 않아야 하는 것: **트리를 못 읽으면 아무것도 고르지 않는다.**
  // 실제 선택지를 모르는 채 카테고리를 만들어내면 잘못된 카테고리로 등록돼
  // 노출 저하·페널티가 난다. 못 고르는 편이 낫다(fail-closed).
  const { autoMatchCategoryId } = await import("../../toss-shop/lib/api/category-auto-match.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => {
    if (hadKey !== undefined) process.env.OPENAI_API_KEY = hadKey;
  });

  const result = await autoMatchCategoryId({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    title: "테스트", keyword: "테스트", category: "home",
  });
  assert.equal(result.confident, false, "트리 조회가 실패하면 확신할 수 없다");
  assert.equal(result.categoryId, undefined, "카테고리 ID를 지어내면 안 된다");
  assert.ok(result.reason, "왜 못 골랐는지 사유가 남아야 한다");
});

test("category resolver: auto_match가 정적 매핑보다 우선하지만 명시 지정보다는 아래", async (t) => {
  const { resolveCategoryId, clearCategoryMapCache } = await import(
    "../../toss-shop/lib/api/category-resolver.ts"
  );
  t.after(() => {
    delete process.env.TOSS_SHOP_CATEGORY_ID_MAP;
    delete process.env.TOSS_SHOP_DEFAULT_CATEGORY_ID;
    clearCategoryMapCache();
  });
  process.env.TOSS_SHOP_CATEGORY_ID_MAP = JSON.stringify({ beauty: 222 });
  clearCategoryMapCache();

  const withAutoMatch = resolveCategoryId({
    category: "beauty",
    autoMatch: { categoryId: 51101, path: ["뷰티", "스킨케어", "세럼/에센스"] },
  });
  assert.equal(withAutoMatch.categoryId, 51101, "실시간 매칭이 정적 매핑(222)보다 우선해야");
  assert.equal(withAutoMatch.source, "auto_match");
  assert.deepEqual(withAutoMatch.matchedPath, ["뷰티", "스킨케어", "세럼/에센스"]);

  const withExplicit = resolveCategoryId({
    category: "beauty",
    explicitCategoryId: 999,
    autoMatch: { categoryId: 51101, path: [] },
  });
  assert.equal(withExplicit.categoryId, 999, "사람이 직접 지정하면 그게 최우선");
});

test("publish: 카테고리 자동 매칭 결과가 실제 등록에 쓰이고 결정 근거가 남는다", async (t) => {
  const { publishListingToToss } = await import("../../toss-shop/lib/api/create-product.ts");
  const { clearCategoryAutoMatchCache } = await import("../../toss-shop/lib/api/category-auto-match.ts");
  const hadKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-test-mock";
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "100";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  const realFetch = globalThis.fetch;
  t.after(() => {
    hadKey === undefined ? delete process.env.OPENAI_API_KEY : (process.env.OPENAI_API_KEY = hadKey);
    delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID;
    delete process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED;
    globalThis.fetch = realFetch;
    clearCategoryAutoMatchCache();
  });
  clearCategoryAutoMatchCache();

  let sentCategoryId;
  const categoryFetch = mockCategoryTreeFetch();
  globalThis.fetch = async (url, opts) => {
    const href = String(url);
    if (href.includes("products/v2") && opts?.method === "POST") {
      sentCategoryId = JSON.parse(opts.body).categoryId;
      return new Response(JSON.stringify({ resultType: "SUCCESS", success: { id: 1 } }), { status: 200 });
    }
    return categoryFetch(url, opts);
  };

  const draft = {
    pickMode: "consignment",
    keyword: "세럼",
    // 토스는 이미지 없는 상품을 거절한다 — 실제 등록 경로를 태우는 테스트는
    // 공급처 실사진이 있는 상태여야 한다
    detailPage: { thumbnailUrl: "https://img.example/thumb.jpg" },
    listingPayload: {
      name: "수분 세럼 30ml", brandName: "에피로드", salePrice: 15000, originPrice: 16000,
      searchKeywords: ["세럼"], description: "설명", categoryHint: "뷰티", category: "beauty",
      deliveryFeeType: "FREE", returnHandling: "seller_handles",
    },
  };

  const res = await publishListingToToss({
    merchantId: "m1",
    config: { accessKey: "k", secretKey: "s", sandbox: true, partnerName: "effiroad" },
    draft,
  });

  assert.equal(res.ok, true);
  assert.equal(sentCategoryId, 51101, "실시간으로 찾은 리프 카테고리가 실제 등록에 쓰여야");
  assert.equal(res.category.source, "auto_match");
  assert.deepEqual(res.category.matchedPath, ["뷰티", "스킨케어", "세럼/에센스"]);
});

test("return location: 매핑에 seller_default가 있으면 공급처 직접수거도 강제 폴백된다", async (t) => {
  // 토스가 반품지 생성 API를 안 준다(405 실측 확인) — 등록을 막으면 사람이
  // 계속 손봐야 하므로 무인화가 안 된다. 그래서 전용 주소가 없는 수거형
  // 공급처는 seller_default로 강제 폴백하고 경고만 남긴다.
  const { resolveReturnLocation, isReturnLocationResolved, clearReturnLocationMapCache } =
    await import("../../toss-shop/lib/api/exchange-return-location.ts");
  t.after(() => {
    clearReturnLocationEnv();
    clearReturnLocationMapCache();
  });
  clearReturnLocationEnv();

  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_MAP = JSON.stringify({
    seller_default: 999,
    "domeggook:다른공급처": 201,
  });
  clearReturnLocationMapCache();

  const d = resolveReturnLocation({
    supplierPlatform: "domeggook", supplierId: "직접수거공급처",
    pickMode: "consignment", returnHandling: "supplier_collects",
  });
  assert.equal(isReturnLocationResolved(d), true, "반품지 없다고 등록을 막으면 안 된다");
  assert.equal(d.locationId, 999);
  assert.ok(d.warnings.some((w) => w.includes("재발송")));
});

// ─────────────────────────────────────────────────────────────
// 반품지 자동 매칭 — 사람이 매핑 JSON을 쓰지 않게 만드는 핵심
// ─────────────────────────────────────────────────────────────

test("주소 매칭: 표기가 달라도 같은 건물이면 같은 반품지로 연결된다", async () => {
  const { compareAddresses, normalizeAddress, buildingKey } = await import(
    "../../toss-shop/lib/api/return-location-matcher.ts"
  );

  // 시/도 표기·우편번호·괄호 주석이 달라도 같은 주소여야 한다
  assert.equal(
    normalizeAddress("인천광역시 남동구 구월로 123"),
    normalizeAddress("인천 남동구 구월로 123"),
  );
  assert.equal(
    compareAddresses("인천광역시 남동구 구월로 123", "(21550) 인천 남동구 구월로 123"),
    "exact_address",
  );

  // 층·호수만 다르면 같은 건물
  assert.equal(
    compareAddresses("인천 남동구 구월로 123, 4층", "인천 남동구 구월로 123 201호"),
    "same_building",
  );
  assert.equal(buildingKey("인천 남동구 구월로 123, 4층"), "인천남동구구월로123");
});

test("주소 매칭: 건물번호가 다르면 절대 같은 곳으로 보지 않는다", async () => {
  const { compareAddresses, matchReturnLocation } = await import(
    "../../toss-shop/lib/api/return-location-matcher.ts"
  );

  // 옆 건물로 반품이 가면 수취 거부 → 미아 → 분쟁이다. 반드시 불일치여야 한다.
  assert.equal(compareAddresses("인천 남동구 구월로 123", "인천 남동구 구월로 125"), null);

  const match = matchReturnLocation({
    locations: [{ id: 1, name: "창고A", address: "인천 남동구 구월로 125", raw: {} }],
    supplierAddress: "인천 남동구 구월로 123",
    supplierPlatform: "domeme",
    supplierId: "s1",
  });
  assert.equal(match, null, "건물번호가 다르면 매칭되면 안 된다");
});

test("주소 매칭: 이름 태그가 주소보다 우선한다", async () => {
  const { matchReturnLocation, jarvisLocationName } = await import(
    "../../toss-shop/lib/api/return-location-matcher.ts"
  );

  assert.equal(jarvisLocationName("domeme", "s1"), "자비스-domeme-s1");

  const match = matchReturnLocation({
    locations: [
      { id: 9, name: "자비스-domeme-s1", address: "", raw: {} },
      { id: 2, name: "다른창고", address: "인천 남동구 구월로 123", raw: {} },
    ],
    supplierAddress: "인천 남동구 구월로 123",
    supplierPlatform: "domeme",
    supplierId: "s1",
  });
  assert.equal(match.location.id, 9);
  assert.equal(match.strength, "name_tag");
});

// ─────────────────────────────────────────────────────────────
// 반품 물류 두뇌
// ─────────────────────────────────────────────────────────────

const policyOf = async (text) => {
  const { readSupplierReturnPolicy } = await import(
    "../../toss-shop/lib/wholesale/supplier-return-policy.ts"
  );
  return readSupplierReturnPolicy(text);
};

test("반품 두뇌: 공급처 수거형인데 주소가 등록돼 있으면 공급처로 직행한다", async () => {
  const { decideReturnLogistics } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf("반품은 공급사에서 직접 수거합니다."),
    supplierPlatform: "domeme",
    supplierId: "s1",
    supplierReturnAddress: "경기 화성시 동탄대로 45",
    registeredLocations: [{ id: 777, name: "공급사창고", address: "경기 화성시 동탄대로 45", raw: {} }],
    sellerOwnedLocationId: 1520171,
    netProfitPerUnitKrw: 5000,
  });
  assert.equal(decision.route, "supplier_direct");
  assert.equal(decision.locationId, 777);
  // 공급처로 직행하면 셀러가 물 반품 물류비가 없다
  assert.equal(decision.reservePerUnitKrw, 0);
});

test("반품 두뇌: 수거형인데 토스에 주소가 없으면 셀러 주소로 강제 폴백하되 프로비저닝은 계속 추천한다", async () => {
  // 사장님 지시: 반품지 없다고 소싱을 막지 말 것. 토스가 반품지 생성 API를
  // 안 주는 이상(405 실측), 등록을 막으면 무인화가 성립하지 않는다.
  const { decideReturnLogistics, canPublishWithDecision } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf("반품은 공급사에서 직접 수거합니다."),
    supplierPlatform: "domeme",
    supplierId: "s1",
    supplierReturnAddress: "경기 화성시 동탄대로 45",
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
    netProfitPerUnitKrw: 5000,
  });
  assert.equal(decision.route, "seller_relay", "등록을 막지 않고 셀러 주소로 진행해야 한다");
  assert.equal(decision.locationId, 1520171);
  assert.ok(canPublishWithDecision(decision), "이 결정으로 바로 등록 가능해야 한다");
  // 공급처 주소는 알고 있으므로 등록되면 비용이 사라진다는 추천은 계속 남긴다
  assert.equal(decision.provisioning.address, "경기 화성시 동탄대로 45");
  assert.ok(decision.reservePerUnitKrw > 0, "강제 폴백 비용은 충당금으로 반영돼야 한다");
});

test("반품 두뇌: 택배 반송형도 수거형과 같이 셀러 주소로 폴백된다", async () => {
  const { decideReturnLogistics } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const policy = await policyOf("반품 주소: 경기 화성시 동탄대로 45 로 착불 반송해 주세요.");
  assert.equal(policy.handling, "supplier_courier");

  const decision = decideReturnLogistics({
    policy,
    supplierPlatform: "domeme",
    supplierId: "s2",
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
    netProfitPerUnitKrw: 5000,
  });
  assert.equal(decision.route, "seller_relay");
  assert.equal(decision.locationId, 1520171);
  assert.ok(decision.provisioning.address.startsWith("경기 화성시 동탄대로 45"));
});

test("반품 두뇌: 안내문이 없으면 셀러 경유로 팔되 왕복비를 미리 뺀다", async () => {
  const { decideReturnLogistics, ASSUMED_RETURN_RATE_CEILING } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf(undefined),
    supplierPlatform: "domeme",
    supplierId: "s3",
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
    shippingFeeKrw: 3000,
    netProfitPerUnitKrw: 5000,
  });
  assert.equal(decision.route, "seller_relay");
  assert.equal(decision.locationId, 1520171);
  // 왕복 2구간 × 반품률 상한 — 예측이 아니라 충당금이다
  assert.equal(decision.reservePerUnitKrw, Math.round(3000 * 2 * ASSUMED_RETURN_RATE_CEILING));
  assert.equal(decision.confidence, "assumed");
});

test("반품 두뇌: 충당금을 빼면 안 남는 상품은 팔지 않는다", async () => {
  const { decideReturnLogistics } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf(undefined),
    supplierPlatform: "domeme",
    supplierId: "s4",
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
    shippingFeeKrw: 5000,
    netProfitPerUnitKrw: 500, // 충당금(5000×2×8%=800)보다 작다
  });
  assert.equal(decision.route, "rejected");
  assert.equal(decision.blocker, "economics");
});

test("반품 두뇌: 반품 불가 공급처는 마진과 무관하게 제외한다", async () => {
  const { decideReturnLogistics } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf("단순 변심 반품 불가 상품입니다."),
    supplierPlatform: "domeme",
    supplierId: "s5",
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
    netProfitPerUnitKrw: 999999,
  });
  assert.equal(decision.route, "rejected");
  assert.equal(decision.blocker, "policy");
});

test("반품 두뇌: 셀러 반품지 자체가 없으면 전역 설정 문제로 표시한다", async () => {
  const { decideReturnLogistics } = await import(
    "../../toss-shop/lib/seller-engine/return-logistics-brain.ts"
  );
  const decision = decideReturnLogistics({
    policy: await policyOf(undefined),
    supplierPlatform: "domeme",
    supplierId: "s6",
    registeredLocations: [],
    sellerOwnedLocationId: undefined,
    netProfitPerUnitKrw: 5000,
  });
  assert.equal(decision.route, "rejected");
  // 다음 후보로 넘어가도 똑같이 막히는 문제 — 공급처 문제와 구분되어야 한다
  assert.equal(decision.blocker, "global_config");
});

// ─────────────────────────────────────────────────────────────
// 공급처 상세 판독
// ─────────────────────────────────────────────────────────────

test("공급처 상세: 반품 라벨이 붙은 주소만 채택하고 출고지는 배제한다", async () => {
  const { readSupplierDetailFromResponse } = await import(
    "../../toss-shop/lib/wholesale/domeggook-detail.ts"
  );
  const detail = readSupplierDetailFromResponse(
    {
      domeggook: {
        seller: { id: "abc123", nick: "테스트공급사" },
        // 출고지는 반품지가 아니다 — 채택되면 안 된다
        sendAddr: "서울 강남구 테헤란로 100",
        returnAddr: "경기 성남시 분당구 판교로 250",
      },
    },
    123,
  );
  assert.equal(detail.returnAddress, "경기 성남시 분당구 판교로 250");
  assert.equal(detail.returnAddressConfidence, "return_labeled");
  assert.equal(detail.sellerId, "abc123");
  assert.ok(
    !detail.addressCandidates.some((c) => c.address.includes("테헤란로")),
    "출고지는 후보에서 제외되어야",
  );
});

test("공급처 상세: 키에 단서 없이 본문에만 있는 주소는 채택하지 않는다", async () => {
  const { readSupplierDetailFromResponse } = await import(
    "../../toss-shop/lib/wholesale/domeggook-detail.ts"
  );
  const detail = readSupplierDetailFromResponse(
    { desc: "본사는 서울 마포구 양화로 45 에 있습니다. 品質 최고." },
    1,
  );
  // 제조사·매장 주소일 수 있다 — 반품지로 쓰면 남의 주소로 반품이 간다
  assert.equal(detail.returnAddress, undefined);
});

// ─────────────────────────────────────────────────────────────
// 구매심리 — 촌스러움·과장 차단
// ─────────────────────────────────────────────────────────────

test("구매심리: 과장·가짜 긴박감 문구는 규칙으로 걸러진다", async () => {
  const { sanitizeCopy, isCopyClean } = await import(
    "../../toss-shop/lib/seller-engine/buyer-psychology.ts"
  );

  assert.equal(isCopyClean("업계 1위 최고급 제품!!!"), false);
  assert.equal(isCopyClean("100% 만족 보장"), false);
  // 재고를 모르면서 쓰는 긴박감은 거짓말이다
  assert.equal(isCopyClean("품절 임박 서두르세요"), false);
  assert.equal(isCopyClean("스테인리스 재질 · 용량 1.2L"), true);

  const { clean, removed } = sanitizeCopy("초특가 대박 상품!!! 튼튼한 손잡이");
  assert.ok(!clean.includes("초특가"));
  assert.ok(!clean.includes("대박"));
  assert.ok(clean.includes("튼튼한 손잡이"));
  assert.ok(!clean.includes("!!!"), "느낌표 도배는 하나로 줄어야");
  assert.ok(removed.length >= 2);
});

test("구매심리: 셀러 관점이 아니라 구매자 관점 문구를 만든다", async () => {
  const { buildPersuasionPlan } = await import(
    "../../toss-shop/lib/seller-engine/buyer-psychology.ts"
  );
  const plan = buildPersuasionPlan({
    title: "스테인리스 보온병 500ml",
    keyword: "보온병",
    facts: {
      priceKrw: 12000,
      category: "home",
      sameDayShipping: true,
      freeShipping: true,
      competitorAvgKrw: 16000,
      returnNote: "단순 변심 반품이 가능합니다.",
    },
  });

  // 마진율 같은 셀러 정보가 고객 문구에 새면 안 된다
  assert.ok(!plan.sellingPoints.some((p) => /마진|MOQ|도매|Jarvis|정책 체크/.test(p)));
  assert.ok(plan.differentiators.some((d) => d.includes("25%")), "중앙가 대비 가격차가 계산되어야");
  assert.ok(plan.sellingPoints.some((p) => p.includes("당일 출고")));
  // 실패해도 되돌릴 수 있다는 게 실물을 못 보는 구매에서 가장 강한 안심 장치다
  assert.ok(plan.objections.some((o) => o.answer.includes("반품")));
});

test("구매심리: 배송 속도가 실측되지 않으면 당일 출고를 약속하지 않는다", async () => {
  const { buildPersuasionPlan } = await import(
    "../../toss-shop/lib/seller-engine/buyer-psychology.ts"
  );
  const plan = buildPersuasionPlan({
    title: "보온병",
    keyword: "보온병",
    facts: { priceKrw: 12000, category: "home", sameDayShipping: false },
  });
  assert.ok(!plan.sellingPoints.some((p) => p.includes("당일 출고")));
  assert.ok(!plan.differentiators.some((d) => d.includes("당일 출고")));
});

// ─────────────────────────────────────────────────────────────
// 시장 스캐너
// ─────────────────────────────────────────────────────────────

const catalogOf = (rows) =>
  rows.map((r, i) => ({
    id: String(i + 1),
    name: r.name,
    category: "home",
    priceKrw: r.price,
    reviewCount: r.reviews,
    rating: 4.5,
    sellerName: "s",
    rank: i + 1,
    rankPrev: i + 1,
    updatedAt: "2026-08-01",
  }));

test("시장 스캐너: 리뷰 장벽이 높으면 검색량이 커도 들어가지 않는다", async () => {
  const { scanOpportunity } = await import("../../toss-shop/lib/seller-engine/market-scanner.ts");
  const scan = scanOpportunity({
    keyword: "보온병",
    catalog: catalogOf([
      { name: "보온병 A", price: 20000, reviews: 4000 },
      { name: "보온병 B", price: 21000, reviews: 3800 },
      { name: "보온병 C", price: 19000, reviews: 5200 },
    ]),
    metrics: {
      keyword: "보온병",
      searchVolume: 90000,
      productCount: 100,
      avgPriceKrw: 20000,
      competitionIntensity: 1,
      updatedAt: "2026-08-01",
      basis: "catalog",
    },
  });
  assert.equal(scan.verdict, "skip");
  assert.ok(scan.blockers.some((b) => b.includes("리뷰")));
});

test("시장 스캐너: 수요가 있고 장벽이 낮으면 진입 판정을 낸다", async () => {
  const { scanOpportunity } = await import("../../toss-shop/lib/seller-engine/market-scanner.ts");
  const scan = scanOpportunity({
    keyword: "실리콘 주걱",
    catalog: catalogOf([
      { name: "실리콘 주걱 A", price: 12000, reviews: 10 },
      { name: "실리콘 주걱 B", price: 9000, reviews: 25 },
      { name: "실리콘 주걱 C", price: 14000, reviews: 5 },
    ]),
    metrics: {
      keyword: "실리콘 주걱",
      searchVolume: 8000,
      productCount: 200,
      avgPriceKrw: 12000,
      competitionIntensity: 1,
      updatedAt: "2026-08-01",
      basis: "catalog",
    },
  });
  assert.equal(scan.verdict, "enter");
  assert.equal(scan.dataQuality, "measured");
});

test("시장 스캐너: 근거가 없으면 절대 진입 판정을 내지 않는다", async () => {
  const { scanOpportunity } = await import("../../toss-shop/lib/seller-engine/market-scanner.ts");
  const scan = scanOpportunity({ keyword: "듣도보도못한키워드", catalog: [] });
  assert.equal(scan.dataQuality, "unmeasured");
  assert.notEqual(scan.verdict, "enter");
});

// ─────────────────────────────────────────────────────────────
// 반품지 프로비저닝 큐
// ─────────────────────────────────────────────────────────────

test("프로비저닝: 막힌 걸 전부 떠넘기지 않고 돈 되는 것만 요청한다", async () => {
  const { planReturnLocationProvisioning, renderProvisioningInstructions } = await import(
    "../../toss-shop/lib/seller-engine/return-location-provisioner.ts"
  );

  const req = (id, addr) => ({
    supplierPlatform: "domeme",
    supplierId: id,
    address: addr,
    suggestedName: `자비스-domeme-${id}`,
    why: "공급처 직접수거",
  });

  const plan = planReturnLocationProvisioning({
    blocked: [
      { request: req("big", "경기 화성시 동탄대로 45"), monthlyValueKrw: 600_000 },
      { request: req("big", "경기 화성시 동탄대로 45"), monthlyValueKrw: 400_000 },
      // 한 번 스친 저가 공급처는 등록 수고를 요청할 값어치가 없다
      { request: req("tiny", "부산 해운대구 센텀로 10"), monthlyValueKrw: 1_000 },
    ],
  });

  assert.equal(plan.asks.length, 1);
  assert.equal(plan.asks[0].request.supplierId, "big");
  assert.equal(plan.asks[0].blockedCount, 2);
  assert.equal(plan.asks[0].monthlyValueKrw, 1_000_000);

  const text = renderProvisioningInstructions(plan);
  // 토스 반품지에는 이름을 붙일 수 없다(실측: 응답에 이름 필드 없음).
  // 그래서 지시서는 주소만 알려줘야 하고, 만들 수 없는 이름을 시키면 안 된다.
  assert.ok(text.includes("경기 화성시 동탄대로 45"), "등록할 주소가 지시서에 나와야");
  assert.ok(!text.includes("이름:"), "붙일 수 없는 이름을 지시하면 안 된다");
  assert.ok(!text.includes("부산 해운대구"), "값어치 낮은 공급처는 올리지 않아야");
});

test("프로비저닝: 이미 요청한 공급처는 다시 올리지 않는다", async () => {
  const { planReturnLocationProvisioning } = await import(
    "../../toss-shop/lib/seller-engine/return-location-provisioner.ts"
  );
  const plan = planReturnLocationProvisioning({
    blocked: [
      {
        request: {
          supplierPlatform: "domeme",
          supplierId: "s1",
          address: "경기 화성시 동탄대로 45",
          suggestedName: "자비스-domeme-s1",
          why: "수거형",
        },
        monthlyValueKrw: 900_000,
      },
    ],
    alreadyAsked: ["domeme:s1"],
  });
  assert.equal(plan.asks.length, 0);
});

test("시장 스캐너: 해시로 지어낸 지표는 실측으로 취급하지 않는다", async () => {
  const { scanOpportunity } = await import("../../toss-shop/lib/seller-engine/market-scanner.ts");
  // market-collector는 매칭 상품이 없으면 키워드 해시로 숫자를 채운다.
  // 그럴듯한 검색량이 나오지만 시장과 무관하므로 진입 근거가 되면 안 된다.
  const scan = scanOpportunity({
    keyword: "존재하지않는키워드",
    catalog: [],
    metrics: {
      keyword: "존재하지않는키워드",
      searchVolume: 38000,
      productCount: 12,
      avgPriceKrw: 20000,
      competitionIntensity: 0.1,
      updatedAt: "2026-08-01",
      basis: "synthetic",
    },
  });
  assert.equal(scan.dataQuality, "unmeasured");
  assert.notEqual(scan.verdict, "enter");
  assert.ok(scan.blockers.some((b) => b.includes("자리표시자")));
});

test("시장 수집기: 매칭 상품 유무로 지표 출처를 표시한다", async () => {
  const { collectMarketIntelligence } = await import("../../toss-shop/lib/market-collector/index.ts");
  const { marketKeywords } = collectMarketIntelligence([
    {
      id: "1", name: "스테인리스 보온병", category: "home", priceKrw: 12000,
      reviewCount: 30, rating: 4.6, sellerName: "s", rank: 1, rankPrev: 1, updatedAt: "2026-08-01",
    },
  ]);
  assert.equal(marketKeywords["보온병"].basis, "catalog");
  // 카탈로그에 매칭이 없는 카테고리 키워드는 자리표시자여야 한다
  assert.equal(marketKeywords["digital"]?.basis ?? "synthetic", "synthetic");
});

test("공급처 상세: 같은 상품을 다시 조회하면 캐시로 API를 재호출하지 않는다", async () => {
  const { fetchSupplierDetail, clearSupplierDetailCache } = await import(
    "../../toss-shop/lib/wholesale/domeggook-detail.ts"
  );

  const prevKey = process.env.DOMEGGOOK_API_KEY;
  const realFetch = globalThis.fetch;
  let calls = 0;
  process.env.DOMEGGOOK_API_KEY = "test-key";
  clearSupplierDetailCache();
  globalThis.fetch = async () => {
    calls++;
    return new Response(
      JSON.stringify({ domeggook: { seller: { id: "s1" }, returnAddr: "경기 화성시 동탄대로 45" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const a = await fetchSupplierDetail(999001, "domeme");
    const b = await fetchSupplierDetail(999001, "domeme");
    assert.equal(a.ok, true);
    assert.equal(b.returnAddress, "경기 화성시 동탄대로 45");
    // 60초마다 도는 사이클에서 캐시가 없으면 도매꾹 API가 막힌다 — 동작 조건이다
    assert.equal(calls, 1, "두 번째 조회는 캐시에서 나와야");
  } finally {
    globalThis.fetch = realFetch;
    clearSupplierDetailCache();
    if (prevKey === undefined) delete process.env.DOMEGGOOK_API_KEY;
    else process.env.DOMEGGOOK_API_KEY = prevKey;
  }
});

test("공급처 상세: 실패는 캐시하지 않는다", async () => {
  const { fetchSupplierDetail, clearSupplierDetailCache } = await import(
    "../../toss-shop/lib/wholesale/domeggook-detail.ts"
  );

  const prevKey = process.env.DOMEGGOOK_API_KEY;
  const realFetch = globalThis.fetch;
  let calls = 0;
  process.env.DOMEGGOOK_API_KEY = "test-key";
  clearSupplierDetailCache();
  globalThis.fetch = async () => {
    calls++;
    // 첫 호출은 실패, 두 번째는 성공 — 일시 장애를 6시간 물고 있으면 안 된다
    if (calls === 1) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify({ domeggook: { returnAddr: "서울 강남구 테헤란로 12" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const first = await fetchSupplierDetail(999002, "domeme");
    assert.equal(first.ok, false);
    const second = await fetchSupplierDetail(999002, "domeme");
    assert.equal(second.ok, true);
    assert.equal(calls, 2, "실패 뒤에는 다시 조회해야");
  } finally {
    globalThis.fetch = realFetch;
    clearSupplierDetailCache();
    if (prevKey === undefined) delete process.env.DOMEGGOOK_API_KEY;
    else process.env.DOMEGGOOK_API_KEY = prevKey;
  }
});

// ─────────────────────────────────────────────────────────────
// 공급처 정책 종합 판독 — 배송비·출고일·도서산간
// ─────────────────────────────────────────────────────────────

test("공급처 정책: 반품·교환 배송비와 출고일을 안내문에서 읽는다", async () => {
  const { readSupplierPolicyFacts } = await import(
    "../../toss-shop/lib/wholesale/supplier-policy-reader.ts"
  );
  const facts = readSupplierPolicyFacts(
    [
      "■ 배송안내",
      "당일발송 (오후 2시 이전 주문 건)",
      "제주 및 도서산간 지역은 4,000원 추가됩니다.",
      "■ 반품/교환",
      "반품 배송비 5,000원 (왕복)",
      "교환 배송비 6,000원",
      "묶음배송 불가",
    ].join("\n"),
  );

  assert.equal(facts.dispatchDays.value, 0, "당일발송은 0일");
  assert.equal(facts.returnShippingKrw.value, 5000);
  assert.equal(facts.exchangeShippingKrw.value, 6000);
  assert.equal(facts.remoteAreaSurchargeKrw.value, 4000);
  assert.equal(facts.bundleShipping, false);
});

test("공급처 정책: 편도로 적힌 반품비는 왕복으로 환산한다", async () => {
  const { readSupplierPolicyFacts } = await import(
    "../../toss-shop/lib/wholesale/supplier-policy-reader.ts"
  );
  // 편도만 보고 그대로 걸면 반품 1건마다 절반이 셀러 손실이 된다
  const facts = readSupplierPolicyFacts("반품 배송비 3,000원 (편도)");
  assert.equal(facts.returnShippingKrw.value, 6000);
});

test("공급처 정책: 못 읽은 값은 지어내지 않고 보수적 기본값으로 채운다", async () => {
  const { readSupplierPolicyFacts, toListingPolicyValues, POLICY_DEFAULTS } = await import(
    "../../toss-shop/lib/wholesale/supplier-policy-reader.ts"
  );
  const facts = readSupplierPolicyFacts("이 상품은 아주 좋은 상품입니다.");
  assert.equal(facts.returnShippingKrw, undefined);
  assert.equal(facts.dispatchDays, undefined);

  const values = toListingPolicyValues(facts);
  assert.equal(values.returnShippingKrw, POLICY_DEFAULTS.returnShippingKrw);
  assert.equal(values.dispatchDays, POLICY_DEFAULTS.dispatchDays);
  // 무엇이 실측이고 무엇이 기본값인지 구분되어야 사후에 조일 수 있다
  assert.equal(values.measured.returnShipping, false);
  assert.equal(values.measured.dispatch, false);
});

test("공급처 정책: 출고 범위는 늦은 쪽을 쓴다 (발송기한 준수가 인센티브 조건)", async () => {
  const { readSupplierPolicyFacts } = await import(
    "../../toss-shop/lib/wholesale/supplier-policy-reader.ts"
  );
  const facts = readSupplierPolicyFacts("주문 후 2~3영업일 이내 발송됩니다.");
  assert.equal(facts.dispatchDays.value, 3);
});

// ─────────────────────────────────────────────────────────────
// 무인 처리 가능 공급처 선별
// ─────────────────────────────────────────────────────────────

const listingOf = (over = {}) => ({
  platform: "domeme",
  itemNo: 1,
  title: "테스트",
  unitPriceKrw: 10000,
  shippingFeeKrw: 3000,
  moq: 1,
  url: "https://x",
  freeShipping: false,
  source: "live",
  sellerId: "s1",
  ...over,
});

test("자율성 필터: 반품 불가 공급처는 팔 수 없음으로 분류한다", async () => {
  const { checkSupplierAutonomy } = await import(
    "../../toss-shop/lib/wholesale/supplier-autonomy-filter.ts"
  );
  const check = checkSupplierAutonomy({
    listing: listingOf({ policyText: "단순 변심 반품 불가 상품입니다." }),
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
  });
  assert.equal(check.verdict, "unsellable");
});

test("자율성 필터: 반품 안내가 없으면 셀러 반품지로 무인 처리한다", async () => {
  const { checkSupplierAutonomy } = await import(
    "../../toss-shop/lib/wholesale/supplier-autonomy-filter.ts"
  );
  const check = checkSupplierAutonomy({
    listing: listingOf(),
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
  });
  assert.equal(check.verdict, "autonomous");
  assert.equal(check.locationId, 1520171);
});

test("자율성 필터: 공급처 수거형은 전용 주소가 없어도 셀러 주소로 무인 처리된다", async () => {
  // 반품지 생성 API가 없는 이상(405 실측), "등록 전엔 소싱 안 함"은 곧 무기한
  // 대기다. 셀러 반품지가 있는 한 항상 autonomous로 판정하고, 등록되면
  // 더 저렴한(0원) 공급처 직행 경로로 자동 승격된다.
  const { checkSupplierAutonomy } = await import(
    "../../toss-shop/lib/wholesale/supplier-autonomy-filter.ts"
  );
  const listing = listingOf({
    policyText: "반품은 공급사에서 직접 수거합니다.",
    supplierReturnAddress: "경기 화성시 동탄대로 45",
  });

  const fallback = checkSupplierAutonomy({
    listing,
    registeredLocations: [],
    sellerOwnedLocationId: 1520171,
  });
  assert.equal(fallback.verdict, "autonomous", "반품지 미등록으로 소싱을 막으면 안 된다");
  assert.equal(fallback.locationId, 1520171, "등록 전에는 셀러 주소로 임시 처리해야 한다");

  const ok = checkSupplierAutonomy({
    listing,
    registeredLocations: [{ id: 900, name: "반품지 #900", address: "경기 화성시 동탄대로 45", raw: {} }],
    sellerOwnedLocationId: 1520171,
  });
  assert.equal(ok.verdict, "autonomous");
  assert.equal(ok.locationId, 900, "등록된 주소가 있으면 그쪽이 우선(비용 0원)이어야 한다");
});

test("자율성 필터: 반품 불가 공급처만 걸러내고 나머지는 전부 소싱 가능하다", async () => {
  const { partitionByAutonomy } = await import(
    "../../toss-shop/lib/wholesale/supplier-autonomy-filter.ts"
  );
  const { autonomous, deferred, unsellable } = partitionByAutonomy(
    [
      listingOf({ sellerId: "a" }),
      // 수거형이어도 셀러 반품지가 있으면 이제 autonomous — 강제 폴백된다
      listingOf({ sellerId: "b", policyText: "반품은 공급사에서 직접 수거합니다." }),
      listingOf({ sellerId: "c", policyText: "반품 및 교환 불가" }),
    ],
    { registeredLocations: [], sellerOwnedLocationId: 1520171 },
  );
  assert.equal(autonomous.length, 2, "반품지 미등록은 더 이상 소싱을 막지 않아야 한다");
  assert.equal(deferred.length, 0);
  assert.equal(unsellable.length, 1, "반품 불가만 진짜로 팔 수 없는 것이다");
});

test("반품지 조회: 이름이 없는 실제 응답 구조를 그대로 판독한다", async () => {
  const { listTossReturnLocations } = await import(
    "../../toss-shop/lib/api/return-location-lookup.ts"
  );
  // 2026-08 실측 응답 형태 — 이름 필드가 없고 items로 감싸여 온다
  const realShape = {
    resultType: "SUCCESS",
    success: {
      items: [
        {
          id: 1520171,
          zipCode: "22161",
          address: "인천광역시 미추홀구 독정이로 113 (숭의동, 다복아파트)",
          detailAddress: "2동305호",
          isMain: false,
        },
        { id: 1518645, zipCode: "", address: "", detailAddress: "", isMain: true },
      ],
    },
  };

  const realFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(realShape), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const { locations } = await listTossReturnLocations("m1", {
      accessKey: "a",
      secretKey: "b",
      sandbox: false,
      partnerName: "t",
    });
    assert.equal(locations.length, 2);
    assert.equal(locations[0].address, "인천광역시 미추홀구 독정이로 113 (숭의동, 다복아파트)");
    assert.equal(locations[0].detailAddress, "2동305호");
    assert.equal(locations[0].zipCode, "22161");
    // 주소가 빈 반품지는 매칭에 쓰이면 안 된다
    assert.equal(locations[1].address, undefined);
    assert.equal(locations[1].isMain, true);
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ─────────────────────────────────────────────────────────────
// 광고 — 입찰가를 손익분기에서 역산한다
// ─────────────────────────────────────────────────────────────

const adPickOf = (over = {}) => ({
  id: "p1",
  keyword: "보온병",
  productName: "스테인리스 보온병",
  suggestedTitle: "스테인리스 보온병 500ml",
  category: "home",
  recommendedPriceKrw: 20000,
  estimatedMarginPct: 25,
  competitionIntensity: 0.4,
  searchVolume: 8000,
  supplierCostKrw: 12000,
  jarvis: { certified: true, confidencePct: 95 },
  ...over,
});

test("광고: 입찰 상한이 판매 1건의 가치에서 역산된다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );

  const plan = buildAdCampaignPlan(adPickOf(), "consignment");

  // 판매 1건 가치 = 순이익(20,000×25%=5,000) + 수수료 면제(20,000×8%=1,600) = 6,600
  // 손익분기 = 6,600 × 전환율 2% × 증분비율 70% = 92원, 상한 = 92×65% = 59원
  assert.equal(plan.estimatedCpcKrw, 59);
  assert.ok(plan.dailyBudgetKrw > 0);
  assert.ok(plan.estimatedDailyClicks > 0);
  assert.equal(plan.autoExecuteReady, true);
  // 수수료 면제분만 세면 상한이 32원까지 떨어져 사실상 광고가 불가능해진다.
  // 광고로 새로 생긴 판매는 이익 전체를 가져온다는 게 이 계산의 핵심이다.
  assert.ok(plan.tactics.some((t) => t.includes("판매 1건 가치")));
});

test("광고: 비싼 상품일수록 감당 가능한 입찰가가 커진다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );
  const cheap = buildAdCampaignPlan(adPickOf({ recommendedPriceKrw: 20000 }), "consignment");
  const rich = buildAdCampaignPlan(
    adPickOf({ recommendedPriceKrw: 50000, estimatedMarginPct: 30 }),
    "consignment",
  );
  assert.ok(rich.estimatedCpcKrw > cheap.estimatedCpcKrw);
});

test("광고: 마진이 얇아 손익분기가 최저 입찰선에 못 미치면 광고를 걸지 않는다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );
  // 저가 상품은 판매 1건 가치가 작아 감당 가능한 입찰가가 바닥으로 떨어진다.
  // 손해는 안 나지만 그 입찰가로는 노출이 안 나올 수 있으므로 자동 집행에서 뺀다.
  const plan = buildAdCampaignPlan(adPickOf({ recommendedPriceKrw: 3000 }), "consignment");
  assert.ok(plan.estimatedCpcKrw < 50);
  assert.equal(plan.autoExecuteReady, false, "노출이 안 나올 입찰가를 자동 집행하면 안 된다");
  assert.ok(plan.tactics.some((t) => t.includes("노출이 거의 안 나올 수 있습니다")));
});

test("광고: 임의의 최저 입찰선으로 광고를 아예 막지는 않는다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );
  // 토스가 공개한 최저 입찰가는 모른다. 우리가 정한 선으로 차단하면
  // 될 수도 있는 광고를 못 하게 된다 — 경고는 하되 숫자는 보여준다.
  const plan = buildAdCampaignPlan(adPickOf({ recommendedPriceKrw: 3000 }), "consignment");
  assert.ok(plan.estimatedCpcKrw > 0, "경제성이 있으면 입찰가는 그대로 보여줘야");
  assert.ok(plan.dailyBudgetKrw > 0);
});

test("광고: 이미 수수료 0%면 면제 효과가 중복되지 않아 광고를 권하지 않는다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );
  const plan = buildAdCampaignPlan(
    adPickOf({
      wholesaleBest: {
        platform: "domeme",
        title: "보온병",
        unitPriceKrw: 12000,
        shippingFeeKrw: 0,
        moq: 1,
        url: "https://x",
        freeShipping: true,
        source: "live",
        sellerId: "s1",
        supplierQuality: {
          grade: "excellent",
          shipSpeed: "same_day",
          verified: true,
          readFrom: ["grade"],
          reason: "우수·당일발송",
        },
      },
    }),
    "consignment",
  );
  // 수수료 면제 보너스는 없지만 증분 판매의 이익은 그대로다 — 광고가 무의미하진 않다
  assert.ok(plan.estimatedCpcKrw > 0);
  assert.ok(plan.tactics.some((t) => t.includes("면제 보너스는 없습니다")));
});

test("광고: 인센티브 자격이 실증되지 않으면 수수료 0%로 가정하지 않는다", async () => {
  const { buildAdCampaignPlan } = await import(
    "../../toss-shop/lib/seller-engine/ad-strategy-engine.ts"
  );
  // verified:false — 판독 안 된 공급처를 0% 취급하면 광고 기회를 통째로 버린다
  const plan = buildAdCampaignPlan(
    adPickOf({
      wholesaleBest: {
        platform: "domeme",
        title: "보온병",
        unitPriceKrw: 12000,
        shippingFeeKrw: 0,
        moq: 1,
        url: "https://x",
        freeShipping: true,
        source: "live",
        sellerId: "s1",
        supplierQuality: {
          grade: "excellent",
          shipSpeed: "same_day",
          verified: false,
          readFrom: [],
          reason: "미확인",
        },
      },
    }),
    "consignment",
  );
  assert.ok(
    plan.tactics.some((t) => t.includes("수수료 면제")),
    "미확인 공급처는 수수료가 부과되므로 면제 보너스가 계산에 들어간다",
  );
});

// ─────────────────────────────────────────────────────────────
// 통합 — 공급처 안내 한 덩어리에서 등록 값까지 이어지는가
// ─────────────────────────────────────────────────────────────

test("통합: 공급처 안내를 읽어 반품지·배송비·안내문까지 한 번에 정해진다", async () => {
  const { decideReturnForListing } = await import(
    "../../toss-shop/lib/seller-engine/return-decision-pipeline.ts"
  );

  // 실제 도매 상세페이지에 흔한 형태의 안내문
  const policyText = [
    "[배송안내]",
    "평일 오후 2시 이전 주문건은 당일발송 됩니다.",
    "제주 및 도서산간 지역은 배송비 4,000원이 추가됩니다.",
    "",
    "[교환/반품 안내]",
    "반품 배송비 3,000원 (편도)",
    "교환 배송비 7,000원",
    "단순변심 반품 가능합니다.",
  ].join("\n");

  const { decision, returnNote, policyValues, policyFacts } = await decideReturnForListing({
    listing: {
      platform: "domeme",
      itemNo: 12345,
      title: "스테인리스 보온병 500ml",
      unitPriceKrw: 12000,
      shippingFeeKrw: 3000,
      moq: 1,
      url: "https://domeme.com/s/12345",
      freeShipping: false,
      source: "live",
      sellerId: "supplier-a",
      policyText,
    },
    registeredLocations: [
      { id: 1520171, name: "반품지 #1520171", address: "인천광역시 미추홀구 독정이로 113", raw: {} },
    ],
    sellerOwnedLocationId: 1520171,
    netProfitPerUnitKrw: 5000,
    skipDetailFetch: true,
  });

  // 반품 처리 주체가 명시되지 않았으므로 셀러 경유로 가되 비용을 반영한다
  assert.equal(decision.route, "seller_relay");
  assert.equal(decision.locationId, 1520171);

  // 편도 3,000원 → 왕복 6,000원으로 환산되어 충당금 계산에 쓰인다
  assert.equal(policyFacts.returnShippingKrw.value, 6000);
  assert.equal(decision.costPerReturnKrw, 6000);
  assert.equal(decision.reservePerUnitKrw, Math.round(6000 * 0.08));

  // 등록에 넣을 값들이 안내문에서 그대로 나온다
  assert.equal(policyValues.dispatchDays, 0, "당일발송");
  assert.equal(policyValues.exchangeShippingKrw, 7000);
  assert.equal(policyValues.remoteAreaSurchargeKrw, 4000);
  assert.equal(policyValues.measured.remoteSurcharge, true);

  // 고객에게 보이는 안내문에는 실제로 읽어낸 금액만 들어간다
  assert.ok(returnNote.includes("6,000원"));
});

test("통합: 도서산간 추가비를 읽으면 등록 페이로드에 그 값이 실린다", async () => {
  const { buildTossCreatePayload } = await import("../../toss-shop/lib/api/create-product.ts");

  const draft = {
    id: "d1",
    keyword: "보온병",
    pickMode: "consignment",
    listingPayload: {
      name: "보온병",
      brandName: "에피로드",
      salePrice: 20000,
      originPrice: 21740,
      searchKeywords: ["보온병"],
      description: "설명",
      categoryHint: "생활/홈",
      category: "home",
      deliveryFeeType: "PAID",
      supplierPolicy: {
        returnShippingKrw: 6000,
        exchangeShippingKrw: 7000,
        dispatchDays: 0,
        remoteAreaSurchargeKrw: 9000,
        measured: {
          returnShipping: true,
          exchangeShipping: true,
          dispatch: true,
          remoteSurcharge: true,
        },
      },
    },
  };

  const body = buildTossCreatePayload(draft, 14817, 1520171);
  // 공급처가 9,000원을 받는데 하드코딩된 3,000/5,000을 걸면 매 건 차액이 손실이다
  assert.equal(body.deliveryPolicy.jejuDeliveryFee, 9000);
  assert.equal(body.deliveryPolicy.islandsMountainsDeliveryFee, 9000);
  assert.equal(body.exchangeReturnPolicy.exchangeRefundLocationId, 1520171);
});

test("통합: 도서산간비를 못 읽었으면 기본값 아래로 내려가지 않는다", async () => {
  const { buildTossCreatePayload } = await import("../../toss-shop/lib/api/create-product.ts");
  const draft = {
    id: "d2",
    keyword: "보온병",
    pickMode: "consignment",
    listingPayload: {
      name: "보온병",
      brandName: "에피로드",
      salePrice: 20000,
      originPrice: 21740,
      searchKeywords: ["보온병"],
      description: "설명",
      categoryHint: "생활/홈",
      category: "home",
      deliveryFeeType: "PAID",
      // supplierPolicy 없음 — 판독 실패
    },
  };
  const body = buildTossCreatePayload(draft, 14817, 1520171);
  assert.equal(body.deliveryPolicy.jejuDeliveryFee, 3000);
  assert.equal(body.deliveryPolicy.islandsMountainsDeliveryFee, 5000);
});

test("autopilot: 반품지 없는 수거형 공급처도 셀러 반품지가 있으면 완전 자동 등록된다", async (t) => {
  // 사장님 지시: "반품지 못 넣는다고 소싱 안 하지 말고 제약 없이 자동화해라."
  // 토스에 반품지 생성 API가 없는 이상(405 실측), 완전 무인화의 유일한 길은
  // 셀러 반품지로 강제 폴백하고 그 비용을 충당금으로 미리 떼는 것이다.
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "1520171";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  t.after(() => {
    delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID;
    delete process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED;
  });

  const { runJarvisAutopilotCycle } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-autopilot-engine.ts"
  );
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");

  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-24");
  for (const p of picks) {
    p.jarvis = { ...(p.jarvis ?? {}), certified: true, confidencePct: 95 };
    p.estimatedMarginPct = Math.max(p.estimatedMarginPct, 20);
    p.estimatedMonthlyProfitKrw = Math.max(p.estimatedMonthlyProfitKrw ?? 0, 500_000);
    p.catalogStrategy = { ...(p.catalogStrategy ?? {}), mode: "avoid_catalog" };
    p.riskPlaybook = { ...(p.riskPlaybook ?? {}), criticalCount: 0, blockCount: 0 };
    // 공급처 직접수거로 확인됐지만 그 주소가 토스에 아직 등록돼 있지 않은
    // 상황 — 종전엔 이 사이클에서 통째로 스킵되거나 사람 승인을 기다렸다.
    p.wholesaleBest = {
      platform: "domeme", title: p.productName, unitPriceKrw: p.supplierCostKrw || 12000,
      shippingFeeKrw: 0, moq: 1, url: "https://x", freeShipping: true,
      source: "live", sellerId: "s-needs-addr", sellerNick: "공급사",
      supplierQuality: {
        grade: "excellent", shipSpeed: "same_day", verified: true,
        fulfillmentRatePct: 99, readFrom: ["grade"], reason: "우수·당일발송",
      },
      policyText: "반품은 공급사에서 직접 수거합니다. 반품 주소: 경기 화성시 동탄대로 45",
    };
  }

  const data = { consignmentPicks: picks, listingDrafts: [], fulfillmentJobs: [] };
  const report = await runJarvisAutopilotCycle({
    merchantId: "m1", accountEmail: "t@t.com", data, catalog: SEED_CATALOG, config: null,
  });

  assert.ok(report.stats.draftsCreated > 0, "소싱 자체는 유지되어야");
  const draft = data.listingDrafts[0];
  // 사람 개입 없이 셀러 반품지로 확정 등록된다 — status가 draft로 강제되지 않는다
  assert.equal(draft.status, "pending_review", "반품지가 확정됐으므로 정상 등록 대기 상태여야");
  assert.equal(
    draft.listingPayload.resolvedReturnLocationId,
    1520171,
    "셀러 반품지로 강제 폴백돼 즉시 등록 가능한 값이 채워져야",
  );
  // 그래도 사장님이 알아야 할 사실은 남긴다 — 반품 오면 재발송이 필요할 수 있음
  assert.ok(
    draft.sellerChecklist.some((s) => s.includes("재발송")),
    "강제 폴백이었다는 사실은 정보로 남아야 한다",
  );
  // 프로비저닝 큐는 여전히 그 주소를 추천한다 — 등록하면 충당금이 0으로 준다
  assert.ok(report.returnProvisioning?.asks.some((a) => a.address === "경기 화성시 동탄대로 45"));
});

// ─────────────────────────────────────────────────────────────
// 반품지 일괄 등록 — 손해를 완전히 0으로 만드는 유일한 실제 경로
// ─────────────────────────────────────────────────────────────

test("일괄 등록: 사이클마다 막힌 공급처가 지워지지 않고 누적된다", async () => {
  const { mergePendingReturnAddresses } = await import(
    "../../toss-shop/lib/seller-engine/return-location-provisioner.ts"
  );
  const req = (id, addr) => ({
    supplierPlatform: "domeme",
    supplierId: id,
    address: addr,
    suggestedName: `자비스-domeme-${id}`,
    why: "수거형",
  });

  // 1번째 사이클: 저가 공급처 하나만 걸림 (오늘의 top-3 추천엔 안 뜰 값이어도 누적엔 남아야)
  const first = mergePendingReturnAddresses({
    existing: [],
    newlyBlocked: [{ request: req("tiny", "부산 해운대구 센텀로 10"), monthlyValueKrw: 1000 }],
    resolvedKeys: [],
    now: "2026-08-01T00:00:00Z",
  });
  assert.equal(first.list.length, 1, "값어치가 작아도 일괄 목록에는 남아야 한다");
  assert.equal(first.added, 1);

  // 2번째 사이클: 같은 공급처가 다시 걸리면 건수만 늘고, 새 공급처도 추가된다
  const second = mergePendingReturnAddresses({
    existing: first.list,
    newlyBlocked: [
      { request: req("tiny", "부산 해운대구 센텀로 10"), monthlyValueKrw: 1000 },
      { request: req("big", "경기 화성시 동탄대로 45"), monthlyValueKrw: 500_000 },
    ],
    resolvedKeys: [],
    now: "2026-08-02T00:00:00Z",
  });
  assert.equal(second.list.length, 2, "지워지지 않고 계속 쌓여야 한다");
  const tiny = second.list.find((x) => x.supplierId === "tiny");
  assert.equal(tiny.blockedCount, 2);

  // 3번째 사이클: tiny 공급처 주소가 등록돼 매칭 성공 — 목록에서 빠져야 한다
  const third = mergePendingReturnAddresses({
    existing: second.list,
    newlyBlocked: [],
    resolvedKeys: ["domeme:tiny"],
    now: "2026-08-03T00:00:00Z",
  });
  assert.equal(third.resolved, 1);
  assert.equal(third.list.length, 1, "등록된 공급처는 자동으로 빠져야 한다");
  assert.equal(third.list[0].supplierId, "big");
});

test("일괄 등록: 지시서에 값어치 필터·3곳 상한이 없다", async () => {
  const { mergePendingReturnAddresses, renderBulkProvisioningInstructions } = await import(
    "../../toss-shop/lib/seller-engine/return-location-provisioner.ts"
  );
  const req = (id) => ({
    supplierPlatform: "domeme",
    supplierId: id,
    address: `주소-${id}`,
    suggestedName: `자비스-domeme-${id}`,
    why: "수거형",
  });
  const { list } = mergePendingReturnAddresses({
    existing: [],
    newlyBlocked: Array.from({ length: 5 }, (_, i) => ({
      request: req(`s${i}`),
      monthlyValueKrw: 1, // 오늘의 추천(planReturnLocationProvisioning)에서는 전부 걸러질 값어치
    })),
    resolvedKeys: [],
    now: "2026-08-01T00:00:00Z",
  });
  assert.equal(list.length, 5, "일괄 목록은 값어치로 거르지 않아야 한다");

  const text = renderBulkProvisioningInstructions(list);
  for (let i = 0; i < 5; i++) assert.ok(text.includes(`주소-s${i}`));
});

// ─────────────────────────────────────────────────────────────
// 사람이 개입하면 수익이 오르는 지점 — 신규 공급처 샘플 검수, 초기 리뷰
// ─────────────────────────────────────────────────────────────

test("체크리스트: 초기 리뷰 확보 권장이 항상 상위에 남는다", async () => {
  const { buildListingDraftFromPick } = await import(
    "../../toss-shop/lib/seller-engine/listing-automation.ts"
  );
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");

  const [pick] = await generateConsignmentPicks(SEED_CATALOG, "2026-08-24");
  const draft = await buildListingDraftFromPick({
    merchantId: "m1", pick, mode: "consignment", draftId: "d3",
  });
  const top4 = draft.sellerChecklist.slice(0, 4);
  assert.ok(
    top4.some((s) => s.includes("초기 리뷰")),
    "카탈로그 진입을 좌우하는 안내가 화면에 실제로 보이는 위치에 있어야",
  );
});


// ─────────────────────────────────────────────────────────────
// 자비스 대화 — 돈이 걸린 행동은 LLM 없이 결정적으로 파싱한다
// ─────────────────────────────────────────────────────────────

test("대화: 송장번호와 택배사를 같이 주면 즉시 등록 의도로 읽는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");

  const a = parseChatAction("1234567890 CJ대한통운");
  assert.equal(a.intent, "register_tracking");
  assert.equal(a.confident, true);
  assert.equal(a.tracking.trackingNumber, "1234567890");
  assert.equal(a.tracking.deliveryCompany, "CJ대한통운");

  // 별칭·하이픈·문장 속에 섞여 있어도 읽어야 한다
  const b = parseChatAction("송장 나왔어 한진 12345678901234 이걸로 넣어줘");
  assert.equal(b.tracking.trackingNumber, "12345678901234");
  assert.equal(b.tracking.deliveryCompany, "한진택배");

  const c = parseChatAction("우체국 6041-2345-6789");
  assert.equal(c.tracking.trackingNumber, "604123456789");
  assert.equal(c.tracking.deliveryCompany, "우체국택배");
});

test("대화: 휴대폰 번호를 송장으로 오인하지 않는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  // 고객 전화번호를 송장으로 등록하면 배송 조회가 통째로 깨진다
  const a = parseChatAction("고객이 01012345678 로 연락왔어");
  assert.notEqual(a.intent, "register_tracking");
});

test("대화: 택배사 없이 송장번호만 오면 되묻는다 (추측 금지)", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  const a = parseChatAction("1234567890");
  assert.equal(a.intent, "register_tracking");
  assert.equal(a.confident, false, "택배사를 지어내면 안 된다");
});

test("대화: 실행·상태·반품지 동기화 의도를 규칙만으로 읽는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  assert.equal(parseChatAction("지금 돌려").intent, "run_now");
  assert.equal(parseChatAction("실행해줘").intent, "run_now");
  assert.equal(parseChatAction("상태 어때?").intent, "status");
  assert.equal(parseChatAction("지금 잘 되고 있어?").intent, "status");
  assert.equal(parseChatAction("반품지 등록했어").intent, "sync_return_locations");
  assert.equal(parseChatAction("반품지 다 넣었어").intent, "sync_return_locations");
  // 그 외는 대화로 넘긴다
  assert.equal(parseChatAction("요즘 뭐가 잘 팔려?").intent, "talk");
});

test("대화: 송장은 가장 오래 기다린 주문에 붙이고, 여러 건이면 알린다", async () => {
  const { pickJobForTracking } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  const job = (id, createdAt, over = {}) => ({
    id, createdAt, updatedAt: createdAt, merchantId: "m1", orderId: 1, orderProductId: 1,
    productName: `상품${id}`, status: "wholesale_ordered", quantity: 1,
    customer: { name: "a", phone: "b", address: "c", zipCode: "d" }, ...over,
  });

  const single = pickJobForTracking([job("a", "2026-08-02")]);
  assert.equal(single.job.id, "a");
  assert.equal(single.ambiguous, false);

  const many = pickJobForTracking([job("new", "2026-08-05"), job("old", "2026-08-01")]);
  assert.equal(many.job.id, "old", "오래 기다린 주문이 발송지연 페널티에 가장 가깝다");
  assert.equal(many.ambiguous, true);

  // 이미 송장이 들어간 주문은 후보가 아니다
  const done = pickJobForTracking([
    job("x", "2026-08-01", { status: "tracking_registered" }),
    job("y", "2026-08-02", { pendingTrackingNumber: "111" }),
  ]);
  assert.equal(done.job, null);
});

test("대화: 상태 요약은 없는 숫자를 지어내지 않는다", async () => {
  const { summarizeJarvisStatus, renderStatusReply } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-chat.ts"
  );
  const s = summarizeJarvisStatus({ listingDrafts: [], fulfillmentJobs: [] }, 10_000_000);
  assert.equal(s.publishedCount, 0);
  assert.equal(s.monthlyNetKrw, 0);
  assert.equal(s.running, false);

  const reply = renderStatusReply(s);
  assert.ok(reply.includes("멈춰"), "안 돌고 있으면 그렇게 말해야");
  // 순익이 0이면 아예 언급하지 않는다 — 0원을 실적처럼 적으면 오해를 부른다
  assert.ok(!reply.includes("이번 달 실제 순익"));
});

// ── 발주·알림 대화 ────────────────────────────────────────────

test("대화: 발주 완료 보고를 정보 요청으로 잘못 읽지 않는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");

  for (const msg of ["발주했어", "발주 완료", "도매매에 주문 넣었어", "발주 다 했다"]) {
    assert.equal(parseChatAction(msg).intent, "mark_ordered", msg);
  }
  for (const msg of ["발주 정보 줘", "뭐 발주해야 해?", "발주 목록 알려줘"]) {
    assert.equal(parseChatAction(msg).intent, "supplier_order_info", msg);
  }
});

test("대화: 반품지 '등록했어'(동기화)와 '주소 줘'(목록)를 구분한다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  assert.equal(parseChatAction("반품지 등록했어").intent, "sync_return_locations");
  assert.equal(parseChatAction("반품지 주소 줘").intent, "return_addresses");
  assert.equal(parseChatAction("반품지 어디 넣어야 해? 주소 알려줘").intent, "return_addresses");
});

test("대화: 내 번호는 저장하고, 송장번호는 번호로 오해하지 않는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");

  const phone = parseChatAction("알림은 내 번호 010-1234-5678 로 보내줘");
  assert.equal(phone.intent, "set_alert_phone");
  assert.equal(phone.alertPhone, "+821012345678", "E.164로 정규화돼야 문자가 나간다");

  // 택배사가 같이 오면 송장이 먼저다 — 그게 시간에 가장 민감하다
  const tracking = parseChatAction("1234567890 CJ대한통운");
  assert.equal(tracking.intent, "register_tracking");
  assert.equal(tracking.tracking.trackingNumber, "1234567890");

  // 고객 휴대폰을 송장으로 등록하면 배송 조회가 통째로 깨진다
  assert.equal(parseChatAction("01012345678").intent, "talk");
});

test("발주 안내는 칸마다 한 줄 — 옮겨 적다 틀릴 여지를 없앤다", async () => {
  const { pickJobsNeedingOrder, renderSupplierOrderBrief, ORDER_BRIEF_LIMIT } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-chat.ts"
  );
  const mk = (id, status, at) => ({
    id,
    merchantId: "m",
    orderId: 1,
    orderProductId: 1,
    productName: `상품${id}`,
    status,
    customer: { name: "홍길동", phone: "010-1111-2222", address: "서울 강남구 1", zipCode: "06000" },
    quantity: 2,
    createdAt: at,
    updatedAt: at,
  });

  const jobs = [
    mk("new", "detected", "2026-08-05"),
    mk("old", "wholesale_ready", "2026-08-01"),
    mk("done", "tracking_registered", "2026-08-02"),
    mk("ordered", "wholesale_ordered", "2026-08-03"),
  ];
  const need = pickJobsNeedingOrder(jobs);
  assert.deepEqual(
    need.map((j) => j.id),
    ["old", "new"],
    "발주 전인 것만, 오래 기다린 순서로",
  );

  const brief = renderSupplierOrderBrief(need);
  assert.ok(brief.includes("수취인: 홍길동"));
  assert.ok(brief.includes("우편번호: 06000"));
  assert.ok(brief.includes("주소: 서울 강남구 1"));
  assert.ok(brief.includes("발주했어"), "다음에 뭘 해야 하는지 알려줘야");

  assert.ok(renderSupplierOrderBrief([]).includes("없습니다"));
  assert.equal(ORDER_BRIEF_LIMIT, 3);
});

test("알림: 확인할 때까지 10분마다 되풀이하고, 확인하면 멈춘다", async () => {
  const { collectOwnerTodos, pickTodosToSend, ALERT_REPEAT_MS, ALERT_MAX_REPEATS } = await import(
    "../../toss-shop/lib/seller-engine/owner-todo-alerts.ts"
  );
  const now = Date.parse("2026-08-05T00:00:00Z");
  const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString();
  const mk = (over) => ({
    id: "a", merchantId: "m", orderId: 1, orderProductId: 1,
    productName: "상품", status: "detected",
    customer: { name: "n", phone: "p", address: "a", zipCode: "z" },
    quantity: 1, createdAt: hoursAgo(24), updatedAt: hoursAgo(24), ...over,
  });

  // 방금 들어온 주문은 알리지 않는다 — 그러면 하루 종일 문자가 온다
  assert.equal(collectOwnerTodos([mk({ createdAt: hoursAgo(1) })], now).length, 0);

  const todos = collectOwnerTodos([mk({})], now);
  assert.equal(todos[0].kind, "need_supplier_order");

  // 처음엔 바로 나간다
  const first = pickTodosToSend(todos, [], { nowMs: now });
  assert.equal(first.toSend.length, 1);
  assert.equal(first.nextState[0].count, 1);

  // 곧바로 또 돌아도 다시 보내지 않는다
  const soon = pickTodosToSend(todos, first.nextState, { nowMs: now + 60_000 });
  assert.equal(soon.toSend.length, 0, "1분 뒤에 또 보내면 알림을 꺼버리게 된다");

  // 10분이 지나면 다시 보낸다 — 못 보고 넘어갔을 수 있으므로
  const later = pickTodosToSend(todos, first.nextState, { nowMs: now + ALERT_REPEAT_MS });
  assert.equal(later.toSend.length, 1);
  assert.equal(later.nextState[0].count, 2);

  // 확인했다고 하면 그 뒤로는 멈춘다
  const acked = pickTodosToSend(todos, later.nextState, {
    nowMs: now + ALERT_REPEAT_MS * 3,
    ackedAt: new Date(now + ALERT_REPEAT_MS * 2).toISOString(),
  });
  assert.equal(acked.toSend.length, 0);

  // 확인이 없어도 상한을 넘겨 계속 보내지는 않는다
  const capped = pickTodosToSend(
    todos,
    [{ kind: "need_supplier_order", lastSentAt: new Date(now).toISOString(), count: ALERT_MAX_REPEATS }],
    { nowMs: now + ALERT_REPEAT_MS * 5 },
  );
  assert.equal(capped.toSend.length, 0);

  // 해소되면 상태에서 빠지고, 다시 생기면 처음부터 알린다
  const cleared = pickTodosToSend([], later.nextState, { nowMs: now });
  assert.deepEqual(cleared.nextState, []);
  assert.equal(pickTodosToSend(todos, cleared.nextState, { nowMs: now }).toSend.length, 1);
});

test("알림: 송장 대기는 발주 시각 기준으로 재는다", async () => {
  const { collectOwnerTodos } = await import(
    "../../toss-shop/lib/seller-engine/owner-todo-alerts.ts"
  );
  const now = Date.parse("2026-08-05T00:00:00Z");
  const hoursAgo = (h) => new Date(now - h * 3_600_000).toISOString();
  const base = {
    id: "a",
    merchantId: "m",
    orderId: 1,
    orderProductId: 1,
    productName: "상품",
    status: "wholesale_ordered",
    customer: { name: "n", phone: "p", address: "a", zipCode: "z" },
    quantity: 1,
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(48),
  };

  // 발주한 지 2시간 — 공급처가 아직 출고 준비 중일 수 있다
  assert.equal(collectOwnerTodos([{ ...base, wholesaleOrderedAt: hoursAgo(2) }], now).length, 0);
  // 8시간 — 이건 밀린 것이다
  const late = collectOwnerTodos([{ ...base, wholesaleOrderedAt: hoursAgo(8) }], now);
  assert.equal(late[0].kind, "need_tracking");
  // 이미 송장이 들어온 건 알리지 않는다
  assert.equal(
    collectOwnerTodos(
      [{ ...base, wholesaleOrderedAt: hoursAgo(8), pendingTrackingNumber: "123" }],
      now,
    ).length,
    0,
  );
});

test("대화: 문자 테스트를 상태 질문으로 잘못 읽지 않는다", async () => {
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");
  for (const msg of ["문자 테스트 해봐", "알림 오나 확인해줘", "sms 테스트"]) {
    assert.equal(parseChatAction(msg).intent, "test_alert", msg);
  }
  // 번호를 주는 건 테스트가 아니라 저장이다
  assert.equal(parseChatAction("내 번호 010-5596-9438").intent, "set_alert_phone");
});


// ── 도매꾹 직접 발굴 ──────────────────────────────────────────

test("발굴: 판매가는 원가에서 계산한 제안이고, 배송비를 빼먹지 않는다", async () => {
  const { buildCatalogFromDiscovery, proposeRetailKrw } = await import(
    "../../toss-shop/lib/wholesale/wholesale-discovery.ts"
  );
  const supply = (no, price, over = {}) => ({
    platform: "domeme", itemNo: no, title: `테스트상품${no}`,
    unitPriceKrw: price, shippingFeeKrw: 0, moq: 1,
    url: "https://x", sellerId: "s1", sellerNick: "공급사",
    freeShipping: true, source: "live", ...over,
  });
  const mk = (sup) => [{ keyword: "양말", category: "fashion", domeListings: 5, supply: sup }];

  const p = buildCatalogFromDiscovery(mk([supply(1, 9000)]), "2026-08-05T00:00:00Z");
  assert.equal(p.length, 1);
  // 수수료와 목표 마진을 얹은 값이어야 한다 — 원가보다 확실히 커야
  assert.ok(p[0].priceKrw > 9000 * 1.5, `제안가 ${p[0].priceKrw}`);
  assert.equal(p[0].priceKrw, proposeRetailKrw(9000));

  // 배송비를 원가에 포함한다. 무료배송으로 걸어놓고 이걸 빼먹으면
  // 팔수록 손해가 나는데 등록한 뒤에야 드러난다.
  const withShip = buildCatalogFromDiscovery(
    mk([supply(2, 5000, { freeShipping: false, shippingFeeKrw: 3000 })]),
    "2026-08-05T00:00:00Z",
  );
  assert.equal(withShip[0].priceKrw, proposeRetailKrw(8000));

  // 모르는 값은 0으로 둔다 — 그럴듯한 수를 넣으면 경쟁 분석이 가짜 위에서 돈다
  assert.equal(p[0].reviewCount, 0);
  // 데모 시드(p001)와 형태가 달라야 실데이터로 인식된다
  assert.ok(!/^p\d{3}$/.test(p[0].id));

  // ★ 너무 싼 물건은 아예 안 본다 — 목표를 수량으로 못 메우기 때문이다
  //
  // 원가 1,500원짜리는 순마진 25%를 지켜도 개당 598원이고, 그 숫자로 월
  // 1,000만원을 만들려면 한 달에 16,722개를 팔아야 한다. 위탁으로 불가능한
  // 수다. 발굴 단계에서 걸러야 후보 자리를 낭비하지 않는다.
  assert.equal(buildCatalogFromDiscovery(mk([supply(3, 500)]), "2026-08-05T00:00:00Z").length, 0);
  assert.equal(
    buildCatalogFromDiscovery(mk([supply(4, 3000)]), "2026-08-05T00:00:00Z").length,
    0,
    "개당 순이익이 목표에 못 미치는 저가 상품은 발굴 단계에서 제외된다",
  );
  // 너무 비싼 물건은 반품 한 건의 타격이 크다
  assert.equal(buildCatalogFromDiscovery(mk([supply(4, 500000)]), "2026-08-05T00:00:00Z").length, 0);
});

test("발굴: 키워드를 앞에서부터만 훑지 않는다", async () => {
  const { rotatingSlice, allDiscoveryKeywords } = await import(
    "../../toss-shop/lib/wholesale/wholesale-discovery.ts"
  );
  const all = [1, 2, 3, 4, 5];
  const a = rotatingSlice(all, 2, 0);
  assert.deepEqual(a.slice, [1, 2]);
  const b = rotatingSlice(all, 2, a.next);
  assert.deepEqual(b.slice, [3, 4], "다음 사이클은 이어서 봐야 전체를 한 바퀴 돈다");
  // 끝에서 앞으로 넘어간다
  assert.deepEqual(rotatingSlice(all, 2, 4).slice, [5, 1]);

  // 카테고리를 번갈아 넣는다 — 중간에 끊겨도 한쪽만 잔뜩 보고 끝나지 않게
  const kws = allDiscoveryKeywords();
  assert.ok(kws.length > 100, "구석구석 보려면 키워드가 넉넉해야 한다");
  const firstSix = new Set(kws.slice(0, 6).map((k) => k.category));
  assert.equal(firstSix.size, 6, "앞 6개가 서로 다른 카테고리여야");
});

// ── 자연어 지시 ───────────────────────────────────────────────

test("지시: 정해진 문구가 아니어도 소싱이 실제로 실행된다", async () => {
  const { parseExtraAction } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-actions.ts"
  );
  for (const msg of ["추가적은 소싱 해", "더 찾아봐", "싹 다 뒤져봐", "구석구석 다 분석해"]) {
    assert.equal(parseExtraAction(msg)?.name, "discover", msg);
  }
  assert.equal(parseExtraAction("싹 다 뒤져봐")?.deep, true);
  assert.equal(parseExtraAction("더 찾아봐")?.deep, false);
});

test("지시: 금액 표기가 달라도 같은 목표로 읽힌다", async () => {
  const { readGoalKrw, parseExtraAction, MIN_GOAL_KRW } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-actions.ts"
  );
  assert.equal(readGoalKrw("월 천만원 벌게 해줘"), 10_000_000);
  assert.equal(readGoalKrw("목표 1000만원"), 10_000_000);
  assert.equal(readGoalKrw("2천만원까지 가보자"), 20_000_000);
  assert.equal(readGoalKrw("700만원은 벌어야지"), 7_000_000);
  assert.equal(readGoalKrw("최소 500만원"), 5_000_000);

  // 범위 밖은 목표가 아니라 희망이다
  assert.equal(readGoalKrw("월 1억 벌자"), null);
  assert.equal(readGoalKrw("10만원"), null);
  assert.ok(MIN_GOAL_KRW > 0);

  const a = parseExtraAction("무조건 월 천만원 벌게 만들어");
  assert.equal(a?.name, "set_goal");
  assert.equal(a?.goalKrw, 10_000_000);
});

test("지시: '확인했어'가 문자 테스트로 새지 않는다", async () => {
  const { parseExtraAction } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-actions.ts"
  );
  const { parseChatAction } = await import("../../toss-shop/lib/seller-engine/jarvis-chat.ts");

  assert.equal(parseExtraAction("확인했어")?.name, "ack_alerts");
  assert.equal(parseExtraAction("알림 그만 보내")?.name, "ack_alerts");
  // "알림 확인했어"를 테스트로 읽으면 확인할 때마다 문자가 한 통씩 더 간다
  assert.notEqual(parseChatAction("알림 확인했어").intent, "test_alert");
  // 테스트 요청은 그대로 테스트로 잡혀야 한다
  assert.equal(parseChatAction("문자 테스트 해봐").intent, "test_alert");

  // 지시가 아닌 말은 아무 행동도 만들지 않는다
  assert.equal(parseExtraAction("오늘 날씨 어때"), null);
  assert.equal(parseExtraAction("반품지 확인해줘"), null);
});

test("도매꾹 응답: 바깥 껍질이 한 겹 더 있어도 상품을 읽는다", async () => {
  // 실측: 도매꾹은 { domeggook: { list: { item: [...] } } } 로 준다.
  // 종전 파서는 list.item만 봐서 정상 응답을 전부 빈 목록으로 읽었고,
  // 오류도 안 나서 "팔 물건이 없다"로 보였다. 이 테스트가 그 재발을 막는다.
  const mod = await import("../../toss-shop/lib/wholesale/domeggook-api.ts");

  const item = { no: 123, title: "테스트 양말", price: 3000, unitQty: 1, id: "s1", nick: "공급사" };
  const shapes = [
    { domeggook: { list: { item: [item] } } },
    { domeme: { list: { item: item } } },
    { list: { item: [item] } },
    { header: {}, body: { list: { item: [item] } } },
  ];

  for (const shape of shapes) {
    const got = mod.__readItemsForTest(shape);
    assert.equal(got.length, 1, JSON.stringify(shape).slice(0, 60));
    assert.equal(got[0].no, 123);
  }

  // 상품이 없으면 빈 배열 — 엉뚱한 걸 상품으로 오인하면 안 된다
  assert.equal(mod.__readItemsForTest({ domeggook: { list: {} } }).length, 0);
  assert.equal(mod.__readItemsForTest({ menu: { item: { label: "메뉴" } } }).length, 0);
});

// ── 상점 운영 두뇌 ────────────────────────────────────────────

test("운영: 잘 팔리는 상품은 건드리지 않는다", async () => {
  const { decideForSku } = await import("../../toss-shop/lib/seller-engine/store-operations.ts");
  const now = Date.parse("2026-08-26T00:00:00Z");
  const ago = (d) => new Date(now - d * 86_400_000).toISOString();

  const selling = {
    productId: 1, productItemId: 11, name: "잘 팔리는 상품",
    salePriceKrw: 12000, originPriceKrw: 15000, landedCostKrw: 5000,
    listedAt: ago(30), lastSoldAt: ago(1), unitsSold30d: 12,
  };
  // 잘 되는 걸 건드리는 게 가장 흔한 실수다. 가격을 내리면 지금 나는 이익만 깎인다.
  assert.equal(decideForSku(selling, now).kind, "hold");
});

test("운영: 안 팔리면 내리되 손해 구간으로는 절대 안 내린다", async () => {
  const { decideForSku, priceFloorKrw } = await import(
    "../../toss-shop/lib/seller-engine/store-operations.ts"
  );
  const now = Date.parse("2026-08-26T00:00:00Z");
  const ago = (d) => new Date(now - d * 86_400_000).toISOString();
  const base = {
    productId: 1, productItemId: 11, name: "안 팔리는 상품",
    salePriceKrw: 20000, originPriceKrw: 25000, landedCostKrw: 8000,
    listedAt: ago(20), unitsSold30d: 0,
  };

  const a = decideForSku(base, now);
  assert.equal(a.kind, "cut_price");
  const floor = priceFloorKrw(base);
  assert.ok(a.toPriceKrw < base.salePriceKrw, "내려야 한다");
  assert.ok(a.toPriceKrw >= floor, `바닥(${floor}) 밑으로 내리면 팔릴수록 손해다`);

  // 이미 바닥이면 더 내리지 않고, 오래 됐으면 숨긴다
  const atFloor = { ...base, salePriceKrw: floor, listedAt: ago(30) };
  assert.equal(decideForSku(atFloor, now).kind, "hide");
  // 바닥이지만 아직 얼마 안 됐으면 지켜본다
  assert.equal(decideForSku({ ...atFloor, listedAt: ago(7) }, now).kind, "hold");
});

test("운영: 원가를 모르면 가격을 만지지 않는다", async () => {
  const { decideForSku, priceFloorKrw } = await import(
    "../../toss-shop/lib/seller-engine/store-operations.ts"
  );
  const now = Date.parse("2026-08-26T00:00:00Z");
  const ago = (d) => new Date(now - d * 86_400_000).toISOString();
  const noCost = {
    productId: 1, productItemId: 11, name: "원가 모름",
    salePriceKrw: 20000, originPriceKrw: 25000,
    listedAt: ago(30), unitsSold30d: 0,
  };
  // 얼마까지 내려도 되는지 모른 채 내리면, 팔릴수록 손해가 나는데
  // 그걸 알아채는 데 몇 주가 걸린다.
  assert.equal(priceFloorKrw(noCost), null);
  assert.equal(decideForSku(noCost, now).kind, "hold");
});

test("운영: 방금 만진 상품은 결과를 보고 나서 다시 만진다", async () => {
  const { decideForSku } = await import("../../toss-shop/lib/seller-engine/store-operations.ts");
  const now = Date.parse("2026-08-26T00:00:00Z");
  const ago = (d) => new Date(now - d * 86_400_000).toISOString();
  const justChanged = {
    productId: 1, productItemId: 11, name: "어제 내린 상품",
    salePriceKrw: 20000, originPriceKrw: 25000, landedCostKrw: 8000,
    listedAt: ago(30), unitsSold30d: 0, lastPriceChangeAt: ago(1),
  };
  // 매일 흔들면 무엇이 효과였는지 영영 모른다
  assert.equal(decideForSku(justChanged, now).kind, "hold");
  assert.equal(decideForSku({ ...justChanged, lastPriceChangeAt: ago(5) }, now).kind, "cut_price");

  // 올린 지 얼마 안 됐으면 "안 팔려서"가 아니라 "아직 안 보여서"일 수 있다
  assert.equal(
    decideForSku({ ...justChanged, listedAt: ago(2), lastPriceChangeAt: undefined }, now).kind,
    "hold",
  );
});

test("운영: 한 사이클에 손대는 개수를 제한한다", async () => {
  const { planStoreOperations, MAX_ACTIONS_PER_CYCLE } = await import(
    "../../toss-shop/lib/seller-engine/store-operations.ts"
  );
  const now = Date.parse("2026-08-26T00:00:00Z");
  const ago = (d) => new Date(now - d * 86_400_000).toISOString();
  const many = Array.from({ length: 25 }, (_, i) => ({
    productId: i, productItemId: 100 + i, name: `상품${i}`,
    salePriceKrw: 20000, originPriceKrw: 25000, landedCostKrw: 8000,
    listedAt: ago(30), unitsSold30d: 0,
  }));
  const plan = planStoreOperations(many, now);
  // 한꺼번에 다 흔들면 무엇이 원인인지 못 읽는다
  assert.ok(plan.cuts.length + plan.hides.length <= MAX_ACTIONS_PER_CYCLE);
});

// ── 택배사 코드 ───────────────────────────────────────────────

test("택배사: 이름이 아니라 토스 코드로 맞추고, 못 맞추면 안 보낸다", async () => {
  const { matchDeliveryCompanyCode } = await import("../../toss-shop/lib/api/product-ops.ts");
  const codes = ["CJ대한통운", "한진택배", "우체국택배", "롯데택배"];

  assert.equal(matchDeliveryCompanyCode("CJ대한통운", codes), "CJ대한통운");
  assert.equal(matchDeliveryCompanyCode("CJ", codes), "CJ대한통운");
  assert.equal(matchDeliveryCompanyCode("대한통운", codes), "CJ대한통운");
  assert.equal(matchDeliveryCompanyCode("한진", codes), "한진택배");

  // 비슷한 게 없으면 아무거나 고르지 않는다 — 엉뚱한 택배사로 등록되면
  // 고객 배송 조회가 다른 회사를 가리킨다
  assert.equal(matchDeliveryCompanyCode("페덱스", codes), null);
  // 목록을 못 받아왔으면 추측하지 않는다
  assert.equal(matchDeliveryCompanyCode("CJ", []), null);
});

// ── 반품지 주소 분해 ──────────────────────────────────────────

test("반품지: 한 줄 주소를 토스 세 칸으로 나누고, 우편번호는 지어내지 않는다", async () => {
  const { splitKoreanAddress } = await import(
    "../../toss-shop/lib/api/return-location-matcher.ts"
  );

  const a = splitKoreanAddress("(06234) 서울 강남구 테헤란로 123, 5층 501호");
  assert.equal(a.zipCode, "06234");
  assert.equal(a.address, "서울 강남구 테헤란로 123");
  assert.equal(a.detailAddress, "5층 501호");

  const b = splitKoreanAddress("06234 서울 강남구 테헤란로 123, 5층");
  assert.equal(b.zipCode, "06234");
  assert.equal(b.detailAddress, "5층");

  // 우편번호가 없으면 빈 값 — 추측해 넣으면 반품 택배가 엉뚱한 동네로 간다
  const c = splitKoreanAddress("서울 강남구 테헤란로 123");
  assert.equal(c.zipCode, "");
  assert.equal(c.address, "서울 강남구 테헤란로 123");

  // 6자리 구우편번호는 토스가 안 받으므로 잡지 않는다
  assert.equal(splitKoreanAddress("(135-080) 서울 강남구 역삼동 1").zipCode, "");
});

test("지시: 운영·반품지등록을 다른 행동으로 오인하지 않는다", async () => {
  const { parseExtraAction } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-actions.ts"
  );
  for (const m of ["안 팔리는 거 가격 내려", "상품 정리해", "운영 좀 해", "할인 걸어"]) {
    assert.equal(parseExtraAction(m)?.name, "operate", m);
  }
  // "반품지 등록해줘"의 '등록'이 확인(ack)으로 새면 시킨 일이 사라진다
  assert.equal(parseExtraAction("반품지 등록해줘")?.name, "register_returns");
  assert.equal(parseExtraAction("확인했어")?.name, "ack_alerts");
});

test("반품지: 우편번호가 원문에 있으면 주소와 함께 잡는다", async () => {
  const { readReturnLocation } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-actions.ts"
  );
  const a = readReturnLocation("06234 서울 강남구 테헤란로 123, 5층 501호");
  assert.equal(a.zipCode, "06234");
  assert.equal(a.address, "서울 강남구 테헤란로 123");
  assert.equal(a.detailAddress, "5층 501호");

  assert.equal(readReturnLocation("(13529) 경기 성남시 분당구 판교로 255, 2동").zipCode, "13529");

  // 우편번호가 없으면 인정하지 않는다 — 지어내면 반품이 다른 동네로 간다
  assert.equal(readReturnLocation("서울 강남구 테헤란로 123"), null);
  // 주소 없이 숫자만 있는 건 반품지가 아니다
  assert.equal(readReturnLocation("06234"), null);
  // 송장번호를 반품지로 오인하면 안 된다
  assert.equal(readReturnLocation("1234567890 CJ대한통운"), null);
});

test("반품지: 우편번호 붙은 주소를 공급처 안내에서 뽑아낸다", async () => {
  const { __readAddressForTest } = await import(
    "../../toss-shop/lib/wholesale/domeggook-detail.ts"
  );
  // 토스 반품지 등록은 우편번호가 필수다. 여기서 안 잡으면 자동 등록이
  // 마지막 한 칸에서 전부 거절된다.
  assert.ok(__readAddressForTest("반품주소: (06234) 서울 강남구 테헤란로 123, 5층").includes("06234"));
  assert.ok(__readAddressForTest("반품지 06234 서울 강남구 테헤란로 123").includes("06234"));
  // 없으면 주소만 — 없는 걸 만들어내지 않는다
  assert.equal(__readAddressForTest("서울 강남구 테헤란로 123"), "서울 강남구 테헤란로 123");
  // 주소가 아예 없으면 null
  assert.equal(__readAddressForTest("서울 당일배송 가능합니다"), null);
});

// ── 도매꾹 발주 API ───────────────────────────────────────────

test("발주: item[]·deliinfo 조립이 실측 스펙과 정확히 맞는다", async () => {
  const { __buildOrderFieldsForTest } = await import(
    "../../toss-shop/lib/wholesale/domeggook-order-api.ts"
  );
  // 도매꾹 연동 가이드(주문서_생성_API_연동_가이드) 예시와 형태를 맞춘다.
  // item[] = 채널||배송비부담||옵션코드|수량||판매자전달사항||배송요청사항
  const single = __buildOrderFieldsForTest({
    market: "dome",
    quantity: 3,
    receiver: { name: "홍길동", phone: "010-1111-2222", address: "서울 강남구 테헤란로 123 5층", zipCode: "06234" },
  });
  assert.equal(single.itemValue, "dome||P||00|3||||", "옵션 없는 단일옵션 상품은 코드 00");

  const withOption = __buildOrderFieldsForTest({
    market: "supply",
    optionCode: "01_03",
    quantity: 2,
    sellerNote: "빠른 배송 부탁드립니다",
    receiver: { name: "홍길동", phone: "010-1111-2222", address: "서울 강남구 테헤란로 123", zipCode: "06234" },
  });
  assert.equal(withOption.itemValue, "supply||P||01_03|2||빠른 배송 부탁드립니다||");

  // deliinfo = 성명|이메일|우편번호|주소1|주소2|휴대전화|추가연락처|상호명|통관고유부호
  const parts = single.deliinfo.split("|");
  assert.equal(parts.length, 9, "9칸을 정확히 채워야 한다 — 하나라도 빠지면 필수칸 누락으로 거절된다");
  assert.equal(parts[0], "홍길동");
  assert.equal(parts[2], "06234", "우편번호는 3번째 칸");
  assert.equal(parts[5], "010-1111-2222", "휴대전화는 6번째 칸");
  assert.equal(parts[7], "에피로드", "상호명 자리 — 도매꾹/도매매 상표가 고객 송장에 노출되면 안 된다");
});

test("발주 백오프: 자격증명을 바꾸면 대기 없이 즉시 다시 시도한다", async (t) => {
  // ★ 실측으로 드러난 결함
  //
  // 사장님이 도매꾹 아이디를 새로 넣었는데도 한 시간 동안 계속 옛날
  // 실패 사유가 그대로 돌아왔다. 백오프가 "언제 실패했는지"만 기억하고
  // "무슨 값으로 실패했는지"는 몰랐기 때문이다 — 계정 정보를 고쳐도
  // 한 시간을 기다려야 새로 시도됐다.
  const mod = await import("../../toss-shop/lib/wholesale/domeggook-order-api.ts");
  const { checkOrderingHealth, clearLoginBackoff } = mod;

  const realFetch = globalThis.fetch;
  const originalId = process.env.DOMEGGOOK_ACCOUNT_ID;
  const originalPw = process.env.DOMEGGOOK_ACCOUNT_PW;
  const originalKey = process.env.DOMEGGOOK_API_KEY;
  t.after(() => {
    globalThis.fetch = realFetch;
    clearLoginBackoff();
    if (originalId === undefined) delete process.env.DOMEGGOOK_ACCOUNT_ID;
    else process.env.DOMEGGOOK_ACCOUNT_ID = originalId;
    if (originalPw === undefined) delete process.env.DOMEGGOOK_ACCOUNT_PW;
    else process.env.DOMEGGOOK_ACCOUNT_PW = originalPw;
    if (originalKey === undefined) delete process.env.DOMEGGOOK_API_KEY;
    else process.env.DOMEGGOOK_API_KEY = originalKey;
  });

  clearLoginBackoff();
  process.env.DOMEGGOOK_ACCOUNT_ID = "wrong-id";
  process.env.DOMEGGOOK_ACCOUNT_PW = "wrong-pw";
  process.env.DOMEGGOOK_API_KEY = "test-key";

  let loginCalls = 0;
  globalThis.fetch = async () => {
    loginCalls += 1;
    return new Response(
      "<response><header><successYN>N</successYN><resultCode>ID_ERROR</resultCode><resultMessage>존재하지 않는 아이디입니다</resultMessage></header></response>",
      { status: 200 },
    );
  };

  const first = await checkOrderingHealth();
  assert.equal(first.loginOk, false);
  assert.equal(loginCalls, 1, "첫 시도는 실제로 로그인을 불러야 한다");

  // 같은(틀린) 자격증명으로 다시 확인하면 — 계정 잠금을 피하려고 물러서야 한다
  const second = await checkOrderingHealth();
  assert.match(second.reason ?? "", /재시도를 미루는 중/, "같은 값이면 대기해야 한다");
  assert.equal(loginCalls, 1, "같은 자격증명이면 다시 로그인을 시도하면 안 된다");

  // ⚠️ 이제 사장님이 새 아이디를 넣었다 — 대기 중에도 즉시 다시 시도해야 한다
  process.env.DOMEGGOOK_ACCOUNT_ID = "correct-id";
  const third = await checkOrderingHealth();
  assert.equal(loginCalls, 2, "자격증명이 바뀌었으면 대기 시간과 무관하게 즉시 재시도해야 한다");
  assert.doesNotMatch(
    third.reason ?? "",
    /재시도를 미루는 중/,
    "새 자격증명에 대한 진짜 결과여야 한다 — 옛 실패 메시지를 재탕하면 안 된다",
  );
});

test("발주: 잔액부족을 키워드로 판별한다", async () => {
  const { __looksLikeInsufficientBalanceForTest } = await import(
    "../../toss-shop/lib/wholesale/domeggook-order-api.ts"
  );
  assert.ok(__looksLikeInsufficientBalanceForTest("이머니 잔액이 부족합니다"));
  assert.ok(__looksLikeInsufficientBalanceForTest("충전 후 다시 시도해 주세요"));
  assert.ok(!__looksLikeInsufficientBalanceForTest("올바른 요청이 아닙니다"));
  assert.ok(!__looksLikeInsufficientBalanceForTest("상품이 품절되었습니다"));
});

test("알림: 이머니 부족은 다른 무엇보다 먼저, 즉시 알린다", async () => {
  const { collectOwnerTodos } = await import(
    "../../toss-shop/lib/seller-engine/owner-todo-alerts.ts"
  );
  const now = Date.parse("2026-08-26T00:00:00Z");
  // 방금 감지됐어도(시간 조건 없음) 바로 떠야 한다 — 이건 시간이 지나서
  // 나빠지는 게 아니라 그 순간부터 전체가 막히는 문제다.
  const todos = collectOwnerTodos([], now, { emoneyInsufficientSince: new Date(now).toISOString() });
  assert.equal(todos[0].kind, "need_emoney");
  assert.ok(todos[0].message.includes("이머니"));

  // 감지된 게 없으면 안 뜬다
  assert.equal(collectOwnerTodos([], now, {}).length, 0);
});

// ── 리스크 집계 — 등록을 영원히 막던 버그 ────────────────────

test("리스크: 항상 붙는 행동 수칙이 상품 위험도로 세어지지 않는다", async () => {
  const { scanMarketplaceRisks, buildRiskPlaybookReport } = await import(
    "../../toss-shop/lib/seller-engine/risk-playbook.ts"
  );
  const input = {
    keyword: "양말",
    productName: "무지 양말 5족",
    suggestedTitle: "양말 무지 5족 세트",
    category: "fashion",
    priceKrw: 9900,
    competitionIntensity: 1.2,
  };

  const risks = scanMarketplaceRisks(input);
  const standing = risks.filter((r) => r.standing);
  // "셀러 직접구매 금지"는 지켜야 할 수칙이지 이 상품의 결함이 아니다.
  // 안내로는 계속 남아야 한다.
  assert.ok(standing.length > 0, "행동 수칙은 안내로 계속 보여야 한다");
  assert.ok(standing.some((r) => r.code === "FAKE_ORDER"));

  const playbook = buildRiskPlaybookReport(input);
  // ★ 이게 이 테스트의 핵심이다.
  // 종전엔 FAKE_ORDER가 critical로 무조건 붙어 criticalCount가 항상 1 이상이었다.
  // 확실성 게이트는 "치명 리스크 0"을 요구하므로 **어떤 상품도 영원히 등록될
  // 수 없었다** — 실제로 등록 0건이었다.
  assert.equal(playbook.criticalCount, 0, "깨끗한 상품은 치명 0이어야 등록될 수 있다");
  assert.equal(playbook.blockCount, 0);
});

test("리스크: 진짜 위반은 여전히 잡는다", async () => {
  const { buildRiskPlaybookReport } = await import(
    "../../toss-shop/lib/seller-engine/risk-playbook.ts"
  );
  // 행동 수칙을 집계에서 뺐다고 실제 감지까지 무뎌지면 안 된다.
  // 실제 규칙에 있는 표현으로 검증한다 — 내가 있을 거라 짐작한 표현 말고.

  // 금지 품목 키워드 → block
  const prohibited = buildRiskPlaybookReport({
    keyword: "의약품",
    productName: "의약품 세트",
    suggestedTitle: "의약품 세트 특가",
    category: "health",
    priceKrw: 29000,
    competitionIntensity: 2.5,
  });
  assert.ok(prohibited.blockCount > 0, "판매 금지 품목은 그대로 걸려야 한다");

  // 의학적 효능 표현 → block
  const healthClaim = buildRiskPlaybookReport({
    keyword: "유산균",
    productName: "당뇨 치료 유산균",
    suggestedTitle: "당뇨 치료에 좋은 유산균",
    category: "health",
    priceKrw: 29000,
    competitionIntensity: 2.5,
  });
  assert.ok(healthClaim.blockCount > 0, "의학적 효능 표현은 그대로 걸려야 한다");
});

// ─────────────────────────────────────────────────────────────
// 초안이 저장되는가 — 실측으로 드러난 매출 0의 원인
// ─────────────────────────────────────────────────────────────

test("autopilot: listingDrafts 키가 없는 신규 가맹점에서도 만든 초안이 data에 남는다", async (t) => {
  // ★ 왜 이 테스트가 필요한가
  //
  // 심박 응답이 이렇게 나왔다: `draftsCreated: 2`인데 `funnel.drafts: 0`.
  // 엔진은 `input.data.listingDrafts ?? []`로 **새 배열**을 만들고 거기에
  // 초안을 넣은 뒤, input.data에는 되꽂지 않았다. 저장 시점에 통째로 증발.
  //
  // 기존 테스트들이 이걸 못 잡은 이유는 전부 `listingDrafts: []`를 미리
  // 넣어줬기 때문이다 — 그러면 `??`가 그 배열을 그대로 쓰므로 참조가 살아있다.
  // 정작 실제 신규 가맹점은 그 키가 **없는** 상태로 시작한다. 테스트가
  // 프로덕션보다 유리한 조건을 깔아준 셈이라 결함을 통과시켰다.
  process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID = "1520171";
  process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED = "true";
  t.after(() => {
    delete process.env.TOSS_SHOP_EXCHANGE_RETURN_LOCATION_ID;
    delete process.env.TOSS_SHOP_RETURN_LOCATION_DEFAULT_IS_SELLER_OWNED;
  });

  const { runJarvisAutopilotCycle } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-autopilot-engine.ts"
  );
  const { generateConsignmentPicks } = await import("../../toss-shop/lib/seller-engine/consignment.ts");
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");

  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-24");
  for (const p of picks) {
    p.jarvis = { ...(p.jarvis ?? {}), certified: true, confidencePct: 95 };
    p.estimatedMarginPct = Math.max(p.estimatedMarginPct, 20);
    p.estimatedMonthlyProfitKrw = Math.max(p.estimatedMonthlyProfitKrw ?? 0, 500_000);
    p.catalogStrategy = { ...(p.catalogStrategy ?? {}), mode: "avoid_catalog" };
    p.riskPlaybook = { ...(p.riskPlaybook ?? {}), criticalCount: 0, blockCount: 0 };
    p.wholesaleBest = {
      platform: "domeme", title: p.productName, unitPriceKrw: p.supplierCostKrw || 12000,
      shippingFeeKrw: 0, moq: 1, url: "https://x", freeShipping: true,
      source: "live", sellerId: "s-fresh", sellerNick: "공급사",
      supplierQuality: {
        grade: "excellent", shipSpeed: "same_day", verified: true,
        fulfillmentRatePct: 99, readFrom: ["grade"], reason: "우수·당일발송",
      },
      policyText: "반품은 공급사에서 직접 수거합니다. 반품 주소: 경기 화성시 동탄대로 45",
    };
  }

  // 신규 가맹점 그대로 — listingDrafts 키가 아예 없다
  const data = { consignmentPicks: picks };
  const report = await runJarvisAutopilotCycle({
    merchantId: "m-fresh", accountEmail: "t@t.com", data, catalog: SEED_CATALOG, config: null,
  });

  assert.ok(report.stats.draftsCreated > 0, "초안이 만들어지긴 해야 이 테스트가 의미가 있다");
  assert.ok(Array.isArray(data.listingDrafts), "엔진이 data.listingDrafts를 만들어 붙여야 한다");
  assert.equal(
    data.listingDrafts.length,
    report.stats.draftsCreated,
    "만들었다고 보고한 수만큼 실제로 data에 남아 있어야 한다 — 여기가 어긋나면 저장 시 증발한다",
  );
});

test("리스크: 상시 행동수칙이 안전점수를 깎아 모든 상품을 막던 결함", async () => {
  // ★ 실측으로 드러난 결함 — 어떤 상품도 인증될 수 없었다
  //
  // 리스크 스캐너는 모든 상품에 똑같이 붙는 **행동 수칙** 8개를 만든다
  // (배송 SLA·필수고시·CS SLA·KC 안내·검색태그 등). 이건 이 상품이
  // 위험하다는 뜻이 아니라 "셀러가 늘 지켜야 할 것"이다.
  //
  // 그런데 안전점수 계산이 그것들까지 감점에 넣었다. 결과:
  //   아무 문제 없는 상품 = 77점, safety 게이트 기준 = 85점
  // 즉 통과 가능한 상품이 존재하지 않았다. 인증이 늘 실패하니 신뢰도는
  // 92%로 덮이고, 초안은 "draft"로 만들어져 자동 등록에서 영원히 빠졌다.
  // 등록 0 · 매출 0의 마지막 원인이 이것이었다.
  const { buildRiskPlaybookReport } = await import(
    "../../toss-shop/lib/seller-engine/risk-playbook.ts"
  );
  const base = {
    keyword: "주방 집게",
    productName: "실리콘 주방 집게 3종",
    suggestedTitle: "실리콘 주방 집게 3종 세트",
    category: "home",
    marginPct: 22,
    priceKrw: 12900,
    mode: "consignment",
    competitionIntensity: 1.4,
    catalogStrategy: { mode: "avoid_catalog" },
  };

  // 깨끗한 상품은 통과해야 한다 — 이게 안 되면 파이프라인 전체가 죽는다
  const clean = buildRiskPlaybookReport(base);
  assert.ok(
    clean.overallSafetyScore >= 85,
    `문제 없는 상품이 safety 게이트(85)를 넘어야 한다 — 실제 ${clean.overallSafetyScore}`,
  );
  assert.equal(clean.criticalCount, 0);
  assert.equal(clean.blockCount, 0);

  // ⚠️ 그렇다고 안전망을 걷어낸 게 아니다 — 진짜 위반은 여전히 막혀야 한다.
  // 위 완화가 "기준을 낮춰서 통과시킨 것"이 되면 페널티로 계정이 정지된다.
  const drug = buildRiskPlaybookReport({
    ...base,
    productName: "의약품 진통제",
    suggestedTitle: "의약품 진통제 특가",
  });
  assert.ok(drug.blockCount > 0, "금지어(의약품)는 여전히 차단돼야");
  assert.ok(drug.overallSafetyScore < 85, "금지어 상품은 safety 게이트를 못 넘어야");

  const claim = buildRiskPlaybookReport({
    ...base,
    category: "health",
    productName: "당뇨 치료 보조제",
    suggestedTitle: "당뇨 치료에 좋은 보조제",
  });
  assert.ok(claim.blockCount > 0, "질병 치료 표방은 여전히 차단돼야");

  const direct = buildRiskPlaybookReport({
    ...base,
    suggestedTitle: "카톡으로 직거래 문의주세요 계좌이체",
  });
  assert.ok(direct.criticalCount > 0, "직거래 유도는 여전히 치명으로 잡혀야");

  // 실측된 위험은 점수를 깎아야 한다 — 상시 항목만 빼는 것이지 전부 빼는 게 아니다
  const lowMargin = buildRiskPlaybookReport({ ...base, marginPct: 3 });
  assert.ok(
    lowMargin.overallSafetyScore < clean.overallSafetyScore,
    "실제로 감지된 위험(저마진)은 여전히 감점돼야 한다",
  );
});

test("발굴 표본은 자기 공급처를 들고 다녀야 한다 — 제안가·원가 짝 어긋남 방지", async () => {
  // ★ 실측으로 드러난 결함 — 「마진 0.2%」의 정체
  //
  // 발굴로 만든 표본의 제안가는 **그 표본을 만든 공급처의 원가**에서
  // 역산한 값이다(목표 순마진 25%). 그런데 하류가 그 사실을 모른 채
  // 키워드로 도매를 다시 검색해, 전혀 다른(대개 더 비싼) 공급처를 원가로
  // 썼다. 제안가는 A 기준, 원가는 B 기준 — 마진이 0에 가깝게 나온다.
  //
  // 그 한 번의 어긋남이 게이트 세 개를 동시에 닫았다:
  //   순마진 게이트 탈락 → 저마진이 리스크로 잡혀 안전점수 72 →
  //   안전점수가 종합점수를 깎아 v6 미달 → 인증 0 → 등록 0.
  const { buildCatalogFromDiscovery, proposeRetailKrw } = await import(
    "../../toss-shop/lib/wholesale/wholesale-discovery.ts"
  );
  const { landedWholesaleUnitCost } = await import(
    "../../toss-shop/lib/wholesale/consignment-search.ts"
  );

  const listing = {
    platform: "domeme",
    title: "실리콘 주방 집게",
    unitPriceKrw: 9000,
    shippingFeeKrw: 0,
    moq: 1,
    url: "https://domeggook.com/1",
    freeShipping: true,
    source: "live",
    itemNo: "1",
  };
  const products = buildCatalogFromDiscovery(
    [{ keyword: "주방 집게", category: "home", supply: [listing] }],
    "2026-08-26T00:00:00.000Z",
  );

  assert.equal(products.length, 1);
  const p = products[0];
  assert.ok(p.sourceListing, "표본이 자기 공급처를 들고 있어야 한다");
  assert.equal(
    landedWholesaleUnitCost(p.sourceListing),
    9000,
    "들고 있는 공급처의 원가가 제안가를 계산할 때 쓴 그 원가여야 한다",
  );
  assert.equal(
    p.priceKrw,
    proposeRetailKrw(9000),
    "제안가는 그 원가에서 나온 값이어야 한다",
  );

  // 짝이 맞으면 마진은 목표 근처가 나온다. 어긋나 있었을 때가 0.2%였다.
  const impliedMarginPct = ((p.priceKrw - 9000) / p.priceKrw) * 100;
  assert.ok(
    impliedMarginPct > 15,
    `제안가와 원가의 짝이 맞으면 마진이 15%를 넘어야 한다 — 실제 ${impliedMarginPct.toFixed(1)}%`,
  );
});

test("발굴 키워드가 쪼개지지 않아야 한다 — 롱테일이 헤드 키워드로 바뀌던 결함", async () => {
  // ★ 실측으로 드러난 결함
  //
  // 키워드 랭킹이 상품명을 공백으로 쪼개 첫 두 낱말을 키워드로 삼았다.
  // 그래서 발굴 검색어 "주방 집게"가 "주방"이 됐다. 두 가지가 동시에 망가진다:
  //
  //  1. 위탁판매의 전제가 무너진다 — 우리는 경쟁이 약한 롱테일을 노리는데
  //     헤드 키워드로 바뀌면 대형 셀러와 정면 충돌한다.
  //  2. 상위셀러 전술의 롱테일 항목 두 개(가중치 18)가 늘 탈락해
  //     정렬 점수가 78%에 닿지 못하고 인증이 막혔다.
  const { buildCatalogFromDiscovery } = await import(
    "../../toss-shop/lib/wholesale/wholesale-discovery.ts"
  );
  const { rankKeywordsForSourcing } = await import(
    "../../toss-shop/lib/seller-engine/intelligence.ts"
  );

  const catalog = buildCatalogFromDiscovery(
    [
      {
        keyword: "주방 집게",
        category: "home",
        supply: [
          {
            platform: "domeme",
            title: "실리콘 집게 3종",
            unitPriceKrw: 9000,
            shippingFeeKrw: 0,
            moq: 1,
            url: "https://domeggook.com/1",
            freeShipping: true,
            source: "live",
            itemNo: "1",
          },
        ],
      },
    ],
    "2026-08-26T00:00:00.000Z",
  );

  assert.equal(catalog[0].sourceKeyword, "주방 집게", "표본이 자기 검색어를 들고 있어야");

  const ranked = rankKeywordsForSourcing(catalog, undefined, 60);
  const keywords = ranked.map((k) => k.keyword);
  assert.ok(
    keywords.includes("주방 집게"),
    `발굴 검색어가 온전한 구절로 남아야 한다 — 실제: ${keywords.slice(0, 8).join(", ")}`,
  );
});

test("상위셀러 전술: 대표아이템 승리 전략도 카탈로그 전략으로 인정된다", async () => {
  // 종전엔 avoid_catalog만 인정했다. 그래서 엔진이 win_representative를
  // 고르면, 같은 항목의 행동지침은 "그 전략을 유지하라"고 하면서 점수는
  // 10점을 깎았다 — 앞뒤가 안 맞는 판정이었다.
  const { buildTopSellerPlaybook } = await import(
    "../../toss-shop/lib/seller-engine/top-seller-playbook.ts"
  );
  const base = {
    keyword: "주방 집게",
    productName: "실리콘 주방 집게",
    category: "home",
    priceKrw: 12900,
    marginPct: 30,
    monthlyProfitKrw: 600_000,
    competitionIntensity: 1.2,
    searchVolume: 5000,
    avgReviewCount: 0,
    mode: "consignment",
    moq: 1,
    wholesaleLive: true,
    freeShippingRecommended: true,
    hasDifferentiatedTitle: true,
  };

  const rep = buildTopSellerPlaybook({
    ...base,
    catalogStrategyMode: "win_representative",
    representativeItemScore: 70,
  });
  const avoid = buildTopSellerPlaybook({
    ...base,
    catalogStrategyMode: "avoid_catalog",
    isolationScore: 70,
  });

  const applied = (pb) => pb.tactics.find((t) => t.id === "catalog_differentiation")?.applied;
  assert.equal(applied(rep), true, "대표아이템 승리 전략도 인정돼야");
  assert.equal(applied(avoid), true, "카탈로그 회피 전략도 인정돼야");

  // 전략이 실제로 미달이면 여전히 탈락해야 한다 — 무조건 통과가 아니다
  const weak = buildTopSellerPlaybook({
    ...base,
    catalogStrategyMode: "win_representative",
    representativeItemScore: 20,
  });
  assert.equal(applied(weak), false, "전략 점수가 미달이면 여전히 탈락해야");
});

test("카테고리: AI 없이도 실제 트리에서 고른다 — 단, 지어내지는 않는다", async () => {
  // ★ 왜 필요한가
  //
  // OpenAI 크레딧이 떨어지자(429 insufficient_quota) 카테고리 매칭이 전부
  // 실패했고, 그 순간 상품 등록이 통째로 멈췄다. 카테고리 하나 고르는 일로
  // 매출 파이프라인 전체가 외부 유료 API에 묶여 있으면 안 된다.
  //
  // 그렇다고 아무 카테고리나 골라선 안 된다 — 잘못된 카테고리 등록은
  // 노출 저하·페널티다. 실제 트리의 선택지 중에서만, 상품명과 실제로
  // 겹치는 낱말이 있을 때만 고른다.
  const { __pickBranchByNameForTest } = await import(
    "../../toss-shop/lib/api/category-auto-match.ts"
  );

  const roots = [
    { id: 1, name: "식품", isLeaf: false },
    { id: 2, name: "뷰티", isLeaf: false },
    { id: 3, name: "생활/주방", isLeaf: false },
    { id: 4, name: "디지털/가전", isLeaf: false },
  ];

  // 최상위는 내부 분류로 좁힌다
  const root = __pickBranchByNameForTest({
    title: "실리콘 주방 집게 3종", keyword: "주방 집게",
    category: "home", options: roots, isRoot: true,
  });
  assert.equal(root.node?.id, 3, "생활/주방으로 내려가야");

  const beauty = __pickBranchByNameForTest({
    title: "수분 세럼 50ml", keyword: "보습 세럼",
    category: "beauty", options: roots, isRoot: true,
  });
  assert.equal(beauty.node?.id, 2, "뷰티로 내려가야");

  // 하위는 상품명과 겹치는 낱말이 있을 때만 내려간다
  const kids = [
    { id: 31, name: "가구/홈데코", isLeaf: false },
    { id: 32, name: "주방용품", isLeaf: false },
    { id: 33, name: "청소용품", isLeaf: false },
  ];
  const deep = __pickBranchByNameForTest({
    title: "실리콘 주방 집게 3종", keyword: "주방 집게",
    category: "home", options: kids, isRoot: false,
  });
  assert.equal(deep.node?.id, 32, "「주방」이 겹치는 주방용품으로 가야");

  // 낱말이 직접 안 겹쳐도, 흔히 속하는 분류어까지 넓혀서 찾는다.
  // "집게"는 "주방용품"과 한 글자도 안 겹치지만 주방용품이 맞다.
  const expanded = __pickBranchByNameForTest({
    title: "실리콘 집게", keyword: "집게",
    category: "home", options: kids, isRoot: false,
  });
  assert.equal(expanded.node?.id, 32, "「집게」는 주방용품으로 넓혀서 찾아야");

  // ⚠️ 겹치는 게 없으면 고르지 않는다 — 이게 페널티를 막는 안전장치다
  const nothing = __pickBranchByNameForTest({
    title: "무선 이어폰", keyword: "이어폰",
    category: "digital", options: kids, isRoot: false,
  });
  assert.equal(nothing.node, undefined, "겹치는 이름이 없으면 고르지 않아야 한다");
  assert.ok(nothing.why, "왜 못 골랐는지 사유가 남아야");

  // 다만 "기타"류가 있으면 그리로 간다 — 지어내는 게 아니라, 어느 세부
  // 분류에도 안 맞는 상품을 위해 토스가 만들어 둔 자리다.
  const withEtc = __pickBranchByNameForTest({
    title: "무선 이어폰", keyword: "이어폰",
    category: "digital", isRoot: false,
    options: [...kids, { id: 39, name: "기타 생활용품", isLeaf: true }],
  });
  assert.equal(withEtc.node?.id, 39, "기타 자리가 있으면 거기로");

  // 최상위에서는 기타로 도망가지 않는다 — 대분류가 어긋나면 그 아래가 전부 어긋난다
  const rootEtc = __pickBranchByNameForTest({
    title: "무선 이어폰", keyword: "이어폰", category: "digital", isRoot: true,
    options: [{ id: 1, name: "식품", isLeaf: false }, { id: 2, name: "기타", isLeaf: false }],
  });
  assert.equal(rootEtc.node, undefined, "최상위는 기타로 넘기면 안 된다");

  // 최상위에서 맞는 이름이 없어도 지어내지 않는다
  const noRoot = __pickBranchByNameForTest({
    title: "무선 이어폰", keyword: "이어폰",
    category: "health", options: [{ id: 9, name: "식품", isLeaf: false }], isRoot: true,
  });
  assert.equal(noRoot.node, undefined, "맞는 최상위가 없으면 고르지 않아야 한다");
});

test("등록 payload: 토스가 필수로 요구하는 항목이 전부 들어간다", async () => {
  // ★ 실측으로 드러난 결함 — 이래서 단 한 건도 등록된 적이 없었다
  //
  // 파이프라인을 끝까지 고쳐 마침내 토스 등록 API를 실제로 불렀더니:
  //   {"stocks":"필수 값이 누락되었습니다."}
  //
  // 공식 문서와 대조하니 빠진 게 하나가 아니라 여섯이었다.
  // 우리 payload가 스펙의 필수 항목을 다 채우는지 여기서 고정한다.
  const { buildTossCreatePayload } = await import(
    "../../toss-shop/lib/api/create-product.ts"
  );

  const draft = {
    pickMode: "consignment",
    keyword: "주방 집게",
    detailPage: { thumbnailUrl: "https://img.example/1.jpg" },
    listingPayload: {
      name: "실리콘 주방 집게 3종",
      brandName: "에피로드",
      salePrice: 12900,
      originPrice: 15900,
      searchKeywords: ["주방 집게"],
      description: "설명",
      category: "home",
      deliveryFeeType: "FREE",
      supplierPolicy: {
        returnShippingKrw: 3500,
        exchangeShippingKrw: 7000,
        dispatchDays: 2,
        remoteAreaSurchargeKrw: 0,
        measured: { returnShipping: true, exchangeShipping: true, dispatch: true, remoteSurcharge: false },
      },
    },
  };

  const body = buildTossCreatePayload(draft, 14835, 111, "https://img.example/1.jpg", {
    stockOptions: [{ groupName: "색상", valueName: "단일" }],
    notice: { categoryCode: "ETC_GOODS", items: [{ id: 27, content: "실리콘" }] },
  });

  // stocks — 옵션이 실제로 실려야 한다 (이게 빠져서 거절당했다)
  assert.equal(body.stocks.length, 1);
  assert.deepEqual(body.stocks[0].options, [{ groupName: "색상", valueName: "단일" }]);
  assert.equal(body.stocks[0].isMainPrice, true, "stocks 중 최소 1개는 대표가격이어야");

  // exchangeReturnPolicy — 네 항목 전부 필수
  const er = body.exchangeReturnPolicy;
  assert.equal(er.exchangeRefundLocationId, 111);
  assert.equal(er.refundOneWayDeliveryFee, 3500, "공급처에서 읽은 실제 반품비를 써야");
  assert.equal(er.exchangeRoundTripDeliveryFee, 7000, "공급처에서 읽은 실제 교환비를 써야");
  assert.ok(er.applicationMethodDescription.length > 0);
  assert.ok(er.applicationMethodDescription.length <= 500, "500자 이내여야");
  assert.ok(er.applicationTermDescription.length > 0);
  assert.ok(er.applicationTermDescription.length <= 500, "500자 이내여야");

  // notice — 전자상거래법상 의무 표시사항
  assert.equal(body.notice.categoryCode, "ETC_GOODS");
  assert.deepEqual(body.notice.items, [{ id: 27, content: "실리콘" }]);
});

test("등록 필수 옵션: 치수처럼 모르는 값을 요구하면 지어내지 않고 막는다", async () => {
  // 필수 옵션이 "가로길이(cm)"처럼 숫자+단위를 요구하는 경우가 있다.
  // 도매 검색 응답에는 그런 치수가 없다. 그럴듯한 숫자를 넣어 올리면
  // 실물과 달라 반품·분쟁으로 돌아온다 — 등록을 막는 게 맞다.
  const { buildStockOptions } = await import(
    "../../toss-shop/lib/api/product-requirements.ts"
  );

  // isOption === false 가 "필수"다 (토스 문서 표기)
  const blocked = buildStockOptions([
    { key: "가로길이", isOption: false, valueCandidates: [], unitValues: ["cm", "mm"] },
  ]);
  assert.ok("blocked" in blocked, "모르는 치수를 요구하면 막아야 한다");

  // ⚠️ 수량은 다르다 — 우리가 아는 값이다.
  // 위탁은 낱개(MOQ≤1)만 소싱해 한 주문에 하나를 사서 그대로 보낸다.
  // "몇 개가 오는가"는 추측이 아니라 우리 이행 구조에서 나오는 사실이다.
  const qty = buildStockOptions(
    [{ key: "수량", isOption: false, valueCandidates: [], unitValues: ["개", "세트", "박스"] }],
    { name: "실리콘 주방 집게" },
  );
  assert.deepEqual(qty.options, [{ groupName: "수량", valueName: "1개" }]);

  // 세트 상품이면 "1개"가 아니라 "1세트"여야 실물과 맞는다
  const setQty = buildStockOptions(
    [{ key: "수량", isOption: false, valueCandidates: [], unitValues: ["개", "세트"] }],
    { name: "실리콘 주방 집게 3종 세트" },
  );
  assert.deepEqual(setQty.options, [{ groupName: "수량", valueName: "1세트" }]);

  // 단위는 반드시 토스가 준 후보 중에서만 고른다 — 없는 단위는 거절당한다
  const onlyBox = buildStockOptions(
    [{ key: "수량", isOption: false, valueCandidates: [], unitValues: ["박스"] }],
    { name: "아무 상품" },
  );
  assert.deepEqual(onlyBox.options, [{ groupName: "수량", valueName: "1박스" }]);

  // 보기가 정해져 있으면 반드시 그중에서 고른다 — 없는 값을 넣으면 거절당한다
  const fromCandidates = buildStockOptions([
    { key: "색상", isOption: false, valueCandidates: ["검정", "흰색"], unitValues: null },
  ]);
  assert.deepEqual(fromCandidates.options, [{ groupName: "색상", valueName: "검정" }]);

  // 자유 입력이면 무난한 값을 쓴다
  const free = buildStockOptions([
    { key: "종류", isOption: false, valueCandidates: [], unitValues: null },
  ]);
  assert.deepEqual(free.options, [{ groupName: "종류", valueName: "단일" }]);

  // 선택 옵션(isOption === true)은 채우지 않는다
  const optional = buildStockOptions([
    { key: "무늬", isOption: true, valueCandidates: ["줄무늬"], unitValues: null },
  ]);
  assert.deepEqual(optional.options, []);
});

test("등록 이미지: url 없는 항목을 넣지 않는다 — 토스가 거절하던 원인", async () => {
  // ★ 실측으로 드러난 결함
  //
  // 종전엔 url이 **없는** DESCRIPTION_HTML 항목을 넣었다. 토스는 그걸 보고
  // "상세 이미지 또는 html을 찾을 수 없음"으로 거절했다 — 가리키는 게
  // 아무것도 없으니 당연하다. url은 255자 제한이라 HTML 본문을 인라인으로
  // 넣을 수도 없고, 실제 이미지 주소를 줘야 한다.
  const { buildImageList } = await import("../../toss-shop/lib/api/create-product.ts");

  // 썸네일 + 상세 이미지
  const full = buildImageList("https://img/thumb.jpg", ["https://img/d1.jpg", "https://img/d2.jpg"]);
  assert.equal(full.length, 3);
  assert.equal(full[0].type, "THUMBNAIL");
  assert.ok(full.every((i) => typeof i.url === "string" && i.url.length > 0), "url 없는 항목이 있으면 안 된다");
  assert.deepEqual(full.map((i) => i.order), ["0", "1", "2"], "순서는 0부터 증가해야");

  // 썸네일만 있으면 상세로도 쓴다 — 토스는 상세를 요구한다
  const onlyThumb = buildImageList("https://img/thumb.jpg", undefined);
  assert.equal(onlyThumb.length, 2);
  assert.equal(onlyThumb[1].type, "DESCRIPTION");

  // 같은 사진이 겹치면 한 번만 — 겹쳐 넣으면 상세가 한 장짜리로 보인다
  const dup = buildImageList("https://img/a.jpg", ["https://img/a.jpg", "https://img/b.jpg"]);
  assert.equal(dup.filter((i) => i.url === "https://img/a.jpg").length, 1);

  // 255자 넘는 주소는 토스가 거절한다 — 아예 넣지 않는다
  const tooLong = `https://img/${"x".repeat(300)}.jpg`;
  assert.equal(buildImageList(tooLong, undefined).length, 0);

  // 이미지가 없으면 빈 배열 — 호출부가 이걸 보고 등록을 막는다
  assert.equal(buildImageList(undefined, []).length, 0);
});

test("상품명: 공급사 원본과 겹치지 않게 우리 브랜드로 구별한다", async () => {
  // 토스가 거절한 실제 사유: "다른 상품과 겹치지 않는 상품명만 쓸 수 있어요."
  // 같은 도매 상품을 원본명 그대로 올리면 충돌한다. 우리 상위셀러 전술
  // (title_thumb_diff)도 원본명 그대로 쓰지 말라고 한다 — 동일 SKU끼리
  // 가격 경쟁만 하게 되기 때문이다.
  const { buildDistinctProductName } = await import(
    "../../toss-shop/lib/seller-engine/listing-automation.ts"
  );

  assert.equal(
    buildDistinctProductName("실리콘 주방 집게 3종", "에피로드"),
    "에피로드 실리콘 주방 집게 3종",
  );

  // 이미 브랜드가 들어 있으면 두 번 붙이지 않는다
  assert.equal(
    buildDistinctProductName("에피로드 주방 집게", "에피로드"),
    "에피로드 주방 집게",
  );

  // 토스 상품명 100자 제한을 넘지 않아야 한다
  const long = buildDistinctProductName("가".repeat(200), "에피로드");
  assert.ok(long.length <= 100, `100자 이내여야 — 실제 ${long.length}`);

  // 빈 제목이어도 무언가는 나와야 한다
  assert.equal(buildDistinctProductName("   ", "에피로드"), "에피로드");
});

// ── 등록 반려 방지: 토스 OpenAPI 스펙 제약을 그대로 지킨다 ──────────

test("반려 방지: 검색 키워드는 공백이 안 된다 — 롱테일 구절을 쪼개서 살린다", async () => {
  // ★ 실측으로 드러난 반려 원인
  //
  // 토스 스펙: searchKeywords 허용 정규식 [0-9a-zA-Z가-힣]{1,10}
  // 즉 **공백 불가, 10자 이하**다. 그런데 우리 대표 키워드는 "주방 집게"처럼
  // 롱테일 구절이라 거의 항상 공백이 들어간다 — 그대로 보내면 사실상
  // 전 상품이 반려된다.
  //
  // 그렇다고 버리면 롱테일 검색 노출을 통째로 잃는다. 구절을 낱말로 쪼개
  // 넣고 붙여 쓴 형태도 함께 넣는다 — 둘 다 원래 키워드에서 나온 말이다.
  const { sanitizeSearchKeywords } = await import(
    "../../toss-shop/lib/api/listing-validator.ts"
  );

  const out = sanitizeSearchKeywords(["주방 집게"]);
  assert.ok(out.includes("주방"), "낱말이 살아야");
  assert.ok(out.includes("집게"), "낱말이 살아야");
  assert.ok(out.includes("주방집게"), "붙여 쓴 형태도 넣어야 — 실제로 그렇게 검색한다");
  assert.ok(out.every((k) => /^[0-9a-zA-Z가-힣]{1,10}$/.test(k)), "전부 스펙을 지켜야");

  // 10자를 넘는 낱말은 자르지 않고 버린다 — 자르면 뜻이 달라져 엉뚱한
  // 검색어에 걸린다
  assert.ok(!sanitizeSearchKeywords(["가나다라마바사아자차카타"]).length);

  // 특수문자는 제거된다
  assert.deepEqual(sanitizeSearchKeywords(["특가!"]), ["특가"]);

  // 중복은 한 번만
  assert.deepEqual(sanitizeSearchKeywords(["집게", "집게"]), ["집게"]);
});

test("반려 방지: 상품명의 허용되지 않는 글자를 걷어낸다", async () => {
  // 토스 상품명 정규식: ^[0-9a-zA-Z가-힣 ()\-·\[\]/&+,~.*_#]{1,100}$
  // 도매꾹 제목에는 `%`, `!` 같은 글자가 흔한데 하나만 섞여도 반려된다.
  const { sanitizeProductName } = await import(
    "../../toss-shop/lib/api/listing-validator.ts"
  );

  // 뜻을 바꾸지 않고 글자만 뺀다
  assert.equal(sanitizeProductName("보습 크림 100% 순수"), "보습 크림 100 순수");
  assert.equal(sanitizeProductName("실리콘 매트 특가!"), "실리콘 매트 특가");
  // 허용된 글자는 그대로 남는다
  assert.equal(sanitizeProductName("주방 집게 3종 (내열) A/B"), "주방 집게 3종 (내열) A/B");
  // 100자 제한
  assert.ok((sanitizeProductName("가".repeat(200)) ?? "").length <= 100);
  // 글자를 다 빼서 이름이랄 게 안 남으면 등록을 막는다
  assert.equal(sanitizeProductName("!!!@@@"), null);
});

test("반려 방지: 등록 규격 위반을 보내기 전에 전부 잡는다", async () => {
  const { validateListingBody } = await import(
    "../../toss-shop/lib/api/listing-validator.ts"
  );

  const good = {
    name: "에피로드 주방 집게 3종",
    brandName: "에피로드",
    categoryId: 14835,
    stocks: [{ options: [{ groupName: "수량", valueName: "1개" }], remainingCount: 99, isMainPrice: true, originPrice: 15900, salePrice: 12900 }],
    images: [
      { type: "THUMBNAIL", url: "https://img/a.jpg", order: "0" },
      { type: "DESCRIPTION", url: "https://img/b.jpg", order: "1" },
    ],
    exposure: { searchKeywords: ["주방", "집게"], description: "설명" },
    deliveryPolicy: { deliveryFeeType: "FREE", preparationDays: 2 },
    exchangeReturnPolicy: {
      exchangeRefundLocationId: 111,
      refundOneWayDeliveryFee: 3000,
      exchangeRoundTripDeliveryFee: 6000,
      applicationMethodDescription: "고객센터로 신청",
      applicationTermDescription: "수령 후 7일 이내",
    },
    notice: { categoryCode: "ETC_GOODS", items: [{ id: 27, content: "실리콘" }] },
  };
  assert.deepEqual(validateListingBody(good), [], "규격을 지킨 상품은 통과해야 한다");

  const field = (b) => validateListingBody(b).map((v) => v.field);

  // 판매가가 정상가보다 높으면 거절된다 (스펙: salePrice <= originPrice)
  assert.ok(
    field({ ...good, stocks: [{ ...good.stocks[0], salePrice: 99999 }] }).some((f) => f.includes("salePrice")),
  );
  // 대표 가격은 정확히 1개
  assert.ok(
    field({ ...good, stocks: [{ ...good.stocks[0], isMainPrice: false }] }).some((f) => f.includes("isMainPrice")),
  );
  // 썸네일 없음
  assert.ok(field({ ...good, images: [good.images[1]] }).some((f) => f === "images"));
  // 상세 이미지 없음
  assert.ok(field({ ...good, images: [good.images[0]] }).some((f) => f === "images"));
  // 공백 있는 검색 키워드
  assert.ok(
    field({ ...good, exposure: { searchKeywords: ["주방 집게"] } }).some((f) => f.includes("searchKeywords")),
  );
  // 브랜드 금지어
  assert.ok(field({ ...good, brandName: "기타" }).some((f) => f === "brandName"));
  // 고시정보 누락
  assert.ok(field({ ...good, notice: { categoryCode: "", items: [] } }).length >= 2);
  // 준비기간 범위 초과
  assert.ok(
    field({ ...good, deliveryPolicy: { preparationDays: 30 } }).some((f) => f.includes("preparationDays")),
  );
});

test("반려 방지: '이 중 하나는 필수' 옵션 그룹을 빠뜨리지 않는다", async () => {
  // 스펙: isOneOfRequiredGroup = true인 그룹 중 최소 1개는 반드시 포함해야
  // 등록된다. 종전엔 이 필드를 아예 읽지도 않아서, 이 조건만 걸린
  // 카테고리에서는 옵션을 비운 채 보내고 반려당했다.
  const { buildStockOptions } = await import(
    "../../toss-shop/lib/api/product-requirements.ts"
  );

  const out = buildStockOptions([
    { key: "색상", isOption: true, valueCandidates: ["검정"], unitValues: null, isOneOfRequiredGroup: true },
    { key: "사이즈", isOption: true, valueCandidates: ["S"], unitValues: null, isOneOfRequiredGroup: true },
  ]);
  assert.equal(out.options.length, 1, "둘 중 하나는 반드시 들어가야 한다");
  assert.equal(out.options[0].valueName, "검정", "보기 중에서 골라야 한다");

  // 해당 조건이 없으면 선택 옵션은 여전히 채우지 않는다
  const none = buildStockOptions([
    { key: "무늬", isOption: true, valueCandidates: ["줄무늬"], unitValues: null, isOneOfRequiredGroup: false },
  ]);
  assert.deepEqual(none.options, []);
});

// ── 월 목표 달성 공식 ──────────────────────────────────────────

test("전략: 목표에서 소싱 기준을 역산한다", async () => {
  // ★ 실측으로 드러난 전략적 결함
  //
  // 소싱이 마진**율**만 봤다. 율 25%를 지켜도 원가 1,500원짜리는 개당
  // 598원이고, 그 숫자로 월 1,000만원을 만들려면 한 달에 16,722개를
  // 팔아야 한다 — 위탁으로 불가능하다. 소싱 단계에서 이미 목표가
  // 불가능해지고 있었다.
  const { computeStrategyTargets, diagnoseStrategy } = await import(
    "../../toss-shop/lib/seller-engine/revenue-strategy.ts"
  );

  const t = computeStrategyTargets({ goalKrw: 10_000_000, skuTarget: 300 });
  assert.ok(
    t.requiredNetProfitPerUnitKrw >= 3000,
    `SKU 300개로 월 1,000만원이면 개당 3,000원 이상이어야 — 실제 ${t.requiredNetProfitPerUnitKrw}`,
  );
  assert.ok(t.requiredLandedCostKrw >= 6000, "그 순이익이 나오려면 원가도 그만큼 필요하다");

  // SKU를 늘리면 개당 요구치가 내려간다 — 둘은 맞바꿀 수 있다
  const wide = computeStrategyTargets({ goalKrw: 10_000_000, skuTarget: 400 });
  assert.ok(wide.requiredNetProfitPerUnitKrw < t.requiredNetProfitPerUnitKrw);

  // ── 병목 진단: 가장 먼저 끊긴 곳 하나만 짚어야 한다 ──
  const noSupply = diagnoseStrategy({
    goalKrw: 10_000_000, discoveredCount: 0, publishedSkus: 0,
    netProfitPerUnitKrw: [], actualMonthlyNetKrw: 0,
  });
  assert.equal(noSupply.constraint, "no_supply");

  // 개당 순이익이 낮으면 SKU를 늘려도 소용없다 — 이걸 먼저 짚어야 한다
  const lowProfit = diagnoseStrategy({
    goalKrw: 10_000_000, discoveredCount: 50, publishedSkus: 10,
    netProfitPerUnitKrw: [600, 700, 800, 900], actualMonthlyNetKrw: 0,
  });
  assert.equal(lowProfit.constraint, "unit_profit_too_low");
  assert.match(lowProfit.priority, /원가/, "무엇을 바꿔야 하는지 말해야 한다");

  // 순이익이 충분하면 그 다음은 SKU 수가 병목이다
  const fewSkus = diagnoseStrategy({
    goalKrw: 10_000_000, discoveredCount: 50, publishedSkus: 10,
    netProfitPerUnitKrw: [5000, 6000, 7000], actualMonthlyNetKrw: 0,
  });
  assert.equal(fewSkus.constraint, "not_enough_skus");
});

test("전략: 개당 순이익 금액이 인증 게이트에 반영된다", async () => {
  // 마진율만 보면 원가 1,500원짜리도 통과한다. 그건 개당 598원이라
  // 아무리 많이 올려도 목표에 못 닿는다 — 금액을 따로 본다.
  const { computeJarvisConfidence, MIN_UNIT_PROFIT_KRW } = await import(
    "../../toss-shop/lib/seller-engine/jarvis-engine.ts"
  );
  const base = {
    integration: { score: 100, tossApi: true, wholesaleApi: true, liveCatalog: true, domemePreferred: true, readyFor90: true, missing: [] },
    v6MasterScore: 85, safetyScore: 95, marginPct: 25, monthlyProfitKrw: 800_000,
    moq: 1, wholesaleLive: true, wholesalePlatform: "domeme",
    criticalRisks: 0, blockRisks: 0, isolationScore: 70, catalogStrategyMode: "avoid_catalog",
    competitionIntensity: 1.0, searchVolume: 6000, topSellerAlignment: 85,
  };

  const cheap = computeJarvisConfidence({ ...base, netProfitPerUnitKrw: 600 });
  const good = computeJarvisConfidence({ ...base, netProfitPerUnitKrw: 6000 });

  const gate = (r) => r.gates.find((g) => g.id === "unit_profit");
  assert.equal(gate(cheap).passed, false, `개당 600원은 ${MIN_UNIT_PROFIT_KRW}원 미만이라 탈락해야`);
  assert.equal(gate(good).passed, true, "개당 6,000원은 통과해야");
  // 하드 게이트다 — 다른 항목이 아무리 좋아도 이건 상쇄되지 않는다.
  // 가중치로만 뒀더니 개당 600원짜리도 신뢰도 99%로 인증됐다.
  assert.equal(cheap.certified, false, "개당 순이익이 미달이면 인증되면 안 된다");
  assert.equal(good.certified, true, "충분하면 인증돼야 한다");
  assert.ok(good.confidencePct > cheap.confidencePct, "신뢰도도 더 높아야 한다");
});

test("카테고리: 붙어 있는 낱말도 알아본다 — 실제 토스 식품 트리로 검증", async () => {
  // ★ 실측한 토스 식품 대분류로 검증한다 (추측한 이름이 아니다)
  //
  // 상품명은 낱말이 붙어서 온다. "볶음참깨"는 "참깨"가 아니고 "컵라면"은
  // "라면"이 아니다. 사전을 정확히 일치하는 열쇠로만 찾으면 전부 놓친다.
  const { __pickBranchByNameForTest } = await import(
    "../../toss-shop/lib/api/category-auto-match.ts"
  );
  const food = [
    "가공/즉석식품", "가루/조미료/향신료", "건강식품", "냉장/냉동식품",
    "생수/음료", "스낵/간식", "신선식품", "유제품/아이스크림/디저트",
    "장/소스", "전통주", "커피/차",
  ].map((n, i) => ({ id: 100 + i, name: n, isLeaf: false }));

  const pick = (title) =>
    __pickBranchByNameForTest({ title, keyword: "", category: "food", options: food, isRoot: false })
      .node?.name;

  assert.equal(pick("국내산 볶음참깨 500g"), "가루/조미료/향신료");
  assert.equal(pick("컵라면 12개입"), "가공/즉석식품");
  assert.equal(pick("냉동만두 1kg"), "냉장/냉동식품");
  assert.equal(pick("원두커피 1kg"), "커피/차");
  assert.equal(pick("유산균 30포"), "건강식품");
});
