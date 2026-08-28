import test from "node:test";
import assert from "node:assert/strict";

import {
  parseTieredPrice,
  unitPriceAtQty,
  resolveSingleUnitSourcing,
  readPriceFieldsFromItemView,
} from "../../toss-shop/lib/wholesale/domeggook-price.ts";
import { pickBestWholesaleMatch } from "../../toss-shop/lib/wholesale/consignment-search.ts";

// ─────────────────────────────────────────────────────────────
// 수량별 구간 가격 — 도매꾹 공식 형식 "1+3800|20+3500|50+3300"
// ─────────────────────────────────────────────────────────────

test("수량별 구간 가격을 판독한다", () => {
  const t = parseTieredPrice("1+3800|20+3500|50+3300");
  assert.equal(t.parsed, true);
  assert.equal(t.tiers.length, 3);
  assert.deepEqual(t.tiers[0], { minQty: 1, unitPriceKrw: 3800 });
  assert.deepEqual(t.tiers[2], { minQty: 50, unitPriceKrw: 3300 });
});

test("고정가(숫자만)도 판독한다", () => {
  const t = parseTieredPrice("4000");
  assert.equal(t.parsed, true);
  assert.deepEqual(t.tiers, [{ minQty: 1, unitPriceKrw: 4000 }]);
});

test("판독 실패는 parsed:false — 0원으로 오해하면 안 된다", () => {
  for (const bad of ["", null, undefined, "협의", "가격문의"]) {
    assert.equal(parseTieredPrice(bad).parsed, false);
  }
});

test("수량에 맞는 구간 단가를 고른다", () => {
  const t = parseTieredPrice("1+3800|20+3500|50+3300");
  assert.equal(unitPriceAtQty(t, 1), 3800);
  assert.equal(unitPriceAtQty(t, 19), 3800);
  assert.equal(unitPriceAtQty(t, 20), 3500);
  assert.equal(unitPriceAtQty(t, 49), 3500);
  assert.equal(unitPriceAtQty(t, 50), 3300);
  assert.equal(unitPriceAtQty(t, 1000), 3300);
});

test("첫 구간보다 적은 수량은 살 수 없다 — 가격을 지어내지 않는다", () => {
  // MOQ 2 상품에 1개 가격을 물으면 null이어야 한다.
  // 여기서 3800을 돌려주면 그게 바로 "1개씩 파는데 2개 가격으로 가져오는" 버그다.
  const t = parseTieredPrice("2+3800|20+3500");
  assert.equal(unitPriceAtQty(t, 1), null);
  assert.equal(unitPriceAtQty(t, 2), 3800);
});

// ─────────────────────────────────────────────────────────────
// 낱개 발주 판정 — 도매매에 있으면 되고, 없으면 안 된다
// ─────────────────────────────────────────────────────────────

test("도매매 가격이 있고 구매단위가 1이면 낱개 발주 가능", () => {
  const s = resolveSingleUnitSourcing({
    supplyPrice: "1+4000",
    supplyUnit: 1,
    domePrice: "10+3200",
    domeMoq: 10,
  });
  assert.equal(s.available, true);
  assert.equal(s.unitPriceKrw, 4000);
  assert.equal(s.market, "supply");
  assert.equal(s.verified, true);
});

test("도매꾹에만 있고 도매매엔 없으면 낱개 발주 불가 — 사용자가 지적한 바로 그 경우", () => {
  const s = resolveSingleUnitSourcing({
    domePrice: "10+3200|50+2900",
    domeMoq: 10,
    // price.supply 없음 = 도매매에서 안 판다
  });
  assert.equal(s.available, false);
  assert.equal(s.minOrderQty, 10);
  assert.match(s.reason, /도매매 가격.*없어/);
});

test("도매매 구매단위가 2면 1개 발주 불가", () => {
  const s = resolveSingleUnitSourcing({ supplyPrice: "2+3800", supplyUnit: 2 });
  assert.equal(s.available, false);
  assert.equal(s.minOrderQty, 2);
  assert.equal(s.unitPriceKrw, 3800, "가격은 읽되 1개 발주는 불가로 판정");
});

test("가격을 못 읽으면 fail-closed — 소싱하지 않는다", () => {
  const s = resolveSingleUnitSourcing({});
  assert.equal(s.available, false);
  assert.equal(s.verified, false);
  assert.match(s.reason, /판독하지 못했다/);
});

test("MOQ만 있고 가격이 없으면 통과시키지 않는다", () => {
  const s = resolveSingleUnitSourcing({ domeMoq: 1 });
  assert.equal(s.available, false);
});

test("응답 껍질이 한 겹 더 있어도 가격 필드를 찾아낸다", () => {
  const fields = readPriceFieldsFromItemView({
    domeggook: {
      price: { dome: "10+3200", supply: "1+4000" },
      qty: { domeMoq: 10, supplyUnit: 1, inventory: 500 },
    },
  });
  assert.equal(fields.supplyPrice, "1+4000");
  assert.equal(fields.domePrice, "10+3200");
  assert.equal(fields.supplyUnit, 1);
  assert.equal(fields.domeMoq, 10);
});

// ─────────────────────────────────────────────────────────────
// 공급처 선택 — 1개를 못 사는 곳은 아무리 싸도 후보가 아니다
// ─────────────────────────────────────────────────────────────

const listing = (over = {}) => ({
  platform: "domeme",
  itemNo: 1,
  title: "테스트 상품",
  unitPriceKrw: 4000,
  shippingFeeKrw: 0,
  moq: 1,
  moqVerified: true,
  url: "https://x",
  freeShipping: true,
  source: "live",
  ...over,
});

test("낱개 발주 되는 것만 고른다 — 싼 묶음에 넘어가지 않는다", () => {
  const best = pickBestWholesaleMatch(
    [
      // 훨씬 싸지만 10개부터 — 위탁으로는 못 쓴다
      listing({ itemNo: 1, unitPriceKrw: 1000, moq: 10, platform: "domeggook" }),
      listing({ itemNo: 2, unitPriceKrw: 4000, moq: 1 }),
    ],
    20_000,
    10,
  );
  assert.equal(best?.itemNo, 2, "묶음 상품이 뽑히면 원가가 통째로 틀어진다");
});

test("낱개 발주 되는 게 하나도 없으면 null — 억지로 고르지 않는다", () => {
  const best = pickBestWholesaleMatch(
    [
      listing({ itemNo: 1, unitPriceKrw: 1000, moq: 10 }),
      listing({ itemNo: 2, unitPriceKrw: 900, moq: 50 }),
    ],
    20_000,
    10,
  );
  assert.equal(best, null);
});

test("MOQ 미확인은 1로 간주하지 않는다 (fail-closed)", () => {
  const best = pickBestWholesaleMatch(
    [listing({ itemNo: 1, moq: 9999, moqVerified: false })],
    20_000,
    10,
  );
  assert.equal(best, null, "MOQ를 모르면 낱개 발주를 약속할 수 없다");
});

test("상세 조회로 확정된 판정이 검색 응답 MOQ보다 우선한다", () => {
  const best = pickBestWholesaleMatch(
    [
      listing({
        itemNo: 1,
        moq: 1,
        moqVerified: true,
        // 상세 조회 결과 실제로는 낱개 발주가 안 되는 상품이었다
        unitSourcing: { available: false, unitPriceKrw: 4000, minOrderQty: 2, market: "supply", verified: true, reason: "구매단위 2" },
      }),
    ],
    20_000,
    10,
  );
  assert.equal(best, null);
});

test("도매매를 도매꾹보다 우선한다 (같은 조건이면)", () => {
  const best = pickBestWholesaleMatch(
    [
      listing({ itemNo: 1, platform: "domeggook", unitPriceKrw: 3900 }),
      listing({ itemNo: 2, platform: "domeme", unitPriceKrw: 4000 }),
    ],
    20_000,
    10,
  );
  assert.equal(best?.platform, "domeme", "낱개 배송대행 구조가 위탁에 맞다");
});
