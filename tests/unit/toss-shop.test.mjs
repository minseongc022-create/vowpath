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
