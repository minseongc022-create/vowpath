import test from "node:test";
import assert from "node:assert/strict";

import { decideCatalogEntry } from "../../toss-shop/lib/seller-engine/catalog-entry-strategy.ts";
import { trueMarginPct, computePriceFloor } from "../../toss-shop/lib/seller-engine/price-floor.ts";

// ─────────────────────────────────────────────────────────────
// 진입 전략이 정한 가격은 **그대로 등록가**가 된다.
// 그러므로 여기서 재는 마진은 실제로 남는 돈이어야 한다.
//
// 종전엔 자체 하한 공식이 수수료만 반영해서, 최종 픽의 마진이 전부
// 9.8~9.9%로 나왔다 — 확실성 게이트가 요구하는 15%를 못 넘는 값이라
// 파이프라인이 자기 게이트가 거절할 가격만 만들어내고 있었다.
// ─────────────────────────────────────────────────────────────

const unitCostFor = (strategy, cost) =>
  strategy === "bundle_2" ? cost * 2 : strategy === "bundle_3" ? cost * 3 : cost;

test("표시 마진이 실제 마진과 일치한다 (광고비·반품충당 반영)", () => {
  for (const cost of [8_000, 12_000, 16_000]) {
    const e = decideCatalogEntry({
      supplierUnitKrw: cost,
      supplierShippingKrw: 0,
      incumbentPriceKrw: 25_000,
      incumbentShippingKrw: 0,
      incumbentIsReal: true,
      baselineDailyUnits: 2,
    });
    assert.equal(e.sourceable, true, `원가 ${cost}는 소싱 가능해야 한다`);
    const verified = trueMarginPct({
      supplierCostKrw: unitCostFor(e.best.strategy, cost),
      priceKrw: e.best.priceKrw,
    });
    assert.ok(
      Math.abs(e.best.marginPct - verified) < 0.2,
      `표시 ${e.best.marginPct}% ≠ 실제 ${verified}% (원가 ${cost})`,
    );
  }
});

test("채택된 가격은 마진 하한을 지킨다", () => {
  const cost = 12_000;
  const e = decideCatalogEntry({
    supplierUnitKrw: cost,
    supplierShippingKrw: 0,
    incumbentPriceKrw: 25_000,
    incumbentShippingKrw: 0,
    incumbentIsReal: true,
    baselineDailyUnits: 2,
  });
  const verified = trueMarginPct({
    supplierCostKrw: unitCostFor(e.best.strategy, cost),
    priceKrw: e.best.priceKrw,
  });
  assert.ok(verified >= 15, `실마진 ${verified}% — 최소 15%를 지켜야 한다`);
});

test("마진이 안 나오는 원가는 거절한다", () => {
  const e = decideCatalogEntry({
    supplierUnitKrw: 20_000, // 시장가의 80% — 15% 마진 불가
    supplierShippingKrw: 0,
    incumbentPriceKrw: 25_000,
    incumbentShippingKrw: 0,
    incumbentIsReal: true,
    baselineDailyUnits: 2,
  });
  assert.equal(e.sourceable, false);
  assert.equal(e.best.strategy, "reject");
});

test("경쟁자가 없으면 최저가 경쟁을 선택지에 넣지 않는다", () => {
  // 대장가가 우리 제안가에서 역산된 값이면, 최저가 경쟁은 우리 가격을
  // 우리가 깎는 순환이 된다 — 항상 하한 아래로 떨어진다.
  const e = decideCatalogEntry({
    supplierUnitKrw: 8_000,
    supplierShippingKrw: 0,
    incumbentPriceKrw: 25_000,
    incumbentShippingKrw: 0,
    incumbentIsReal: false,
    baselineDailyUnits: 2,
  });
  assert.ok(
    !e.options.some((o) => o.strategy === "undercut"),
    "관측되지 않은 대장을 상대로 최저가 경쟁을 계산하면 안 된다",
  );
});

test("플래그를 안 주면 종전대로 최저가 경쟁을 포함한다 (하위 호환)", () => {
  const e = decideCatalogEntry({
    supplierUnitKrw: 8_000,
    supplierShippingKrw: 0,
    incumbentPriceKrw: 25_000,
    incumbentShippingKrw: 0,
    baselineDailyUnits: 2,
  });
  assert.ok(e.options.some((o) => o.strategy === "undercut"));
});

test("원가가 좋을수록 마진이 커진다 — 단조성", () => {
  const margins = [8_000, 12_000, 16_000].map((cost) => {
    const e = decideCatalogEntry({
      supplierUnitKrw: cost,
      supplierShippingKrw: 0,
      incumbentPriceKrw: 25_000,
      incumbentShippingKrw: 0,
      incumbentIsReal: true,
      baselineDailyUnits: 2,
    });
    return e.best.marginPct;
  });
  assert.ok(margins[0] > margins[1] && margins[1] > margins[2], `단조 감소여야 한다: ${margins}`);
});

test("묶음 하한도 광고비를 반영한다", () => {
  const cost = 10_000;
  const e = decideCatalogEntry({
    supplierUnitKrw: cost,
    supplierShippingKrw: 0,
    incumbentPriceKrw: 30_000,
    incumbentShippingKrw: 0,
    incumbentIsReal: true,
    baselineDailyUnits: 2,
  });
  const bundle = e.options.find((o) => o.strategy === "bundle_2");
  assert.ok(bundle);
  const floor = computePriceFloor({ supplierCostKrw: cost * 2, targetMarginPct: 15 });
  assert.ok(
    bundle.priceKrw >= floor.floorKrw,
    `묶음가 ${bundle.priceKrw} < 하한 ${floor.floorKrw}`,
  );
});

test("파이프라인: 묶음 픽의 마진이 낱개 원가로 부풀려지지 않는다", async () => {
  const { generateConsignmentPicks } = await import(
    "../../toss-shop/lib/seller-engine/consignment.ts"
  );
  const { SEED_CATALOG } = await import("../../toss-shop/lib/seed.ts");
  const picks = await generateConsignmentPicks(SEED_CATALOG, "2026-08-28");
  assert.ok(picks.length > 0, "픽이 나와야 한다");

  for (const p of picks) {
    // 진입 전략이 계산한 마진과 픽에 실린 마진이 같아야 한다.
    // 종전엔 픽 쪽에서 낱개 원가로 다시 계산해, 2입 묶음의 마진이
    // 15%인데 47.8%로 표시됐다.
    assert.equal(
      p.estimatedMarginPct,
      p.catalogEntry.best.marginPct,
      `${p.keyword}: 표시 마진(${p.estimatedMarginPct}%)이 진입전략 마진(${p.catalogEntry.best.marginPct}%)과 다르다`,
    );
    assert.ok(
      p.estimatedMarginPct >= 15,
      `${p.keyword}: 마진 ${p.estimatedMarginPct}% — 하한 15% 미만이 통과됐다`,
    );
    assert.equal(p.recommendedPriceKrw, p.catalogEntry.best.priceKrw, `${p.keyword}: 등록가 불일치`);
  }
});
