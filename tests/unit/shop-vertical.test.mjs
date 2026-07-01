import test from "node:test";
import assert from "node:assert/strict";
import { normalizeShopVertical, ALL_SHOP_VERTICALS } from "../../lib/shop-vertical.ts";

test("normalizeShopVertical: known verticals", () => {
  for (const v of ALL_SHOP_VERTICALS) {
    assert.equal(normalizeShopVertical(v), v);
  }
});

test("normalizeShopVertical: unknown → restoration", () => {
  assert.equal(normalizeShopVertical("unknown"), "restoration");
  assert.equal(normalizeShopVertical(null), "restoration");
  assert.equal(normalizeShopVertical(undefined), "restoration");
  assert.equal(normalizeShopVertical(""), "restoration");
  assert.equal(normalizeShopVertical(42), "restoration");
});

test("normalizeShopVertical: case insensitive", () => {
  assert.equal(normalizeShopVertical("HVAC"), "hvac");
  assert.equal(normalizeShopVertical("Restoration"), "restoration");
});

test("ALL_SHOP_VERTICALS has 6 entries", () => {
  assert.equal(ALL_SHOP_VERTICALS.length, 6);
});
