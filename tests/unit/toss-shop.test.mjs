import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSettlementCsv } from "../../toss-shop/lib/settlement-csv.ts";

test("parseSettlementCsv parses English headers", () => {
  const csv = `order_id,order_date,product_name,gross_krw,platform_fee_krw,shipping_fee_krw
TS-001,2026-08-15,테스트상품,10000,800,0`;
  const rows = parseSettlementCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].orderId, "TS-001");
  assert.equal(rows[0].grossKrw, 10000);
  assert.equal(rows[0].expectedPayoutKrw, 9200);
});

test("parseSettlementCsv returns empty for header-only csv", () => {
  assert.deepEqual(parseSettlementCsv("order_id,gross_krw"), []);
});
