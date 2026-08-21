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
