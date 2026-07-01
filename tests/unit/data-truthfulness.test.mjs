import test from "node:test";
import assert from "node:assert/strict";
import {
  canShowRevenue,
  isPracticeMode,
  fieldDisplayValue,
  safeRevenueDisplay,
} from "../../lib/data-truthfulness.ts";

test("canShowRevenue: false when Jobber not connected", () => {
  assert.equal(canShowRevenue(false), false);
});

test("canShowRevenue: true when Jobber connected", () => {
  assert.equal(canShowRevenue(true), true);
});

test("isPracticeMode: true when shadowModeRemaining > 0", () => {
  assert.equal(isPracticeMode({ shadowModeRemaining: 5 }), true);
  assert.equal(isPracticeMode({ shadowModeRemaining: 0 }), false);
  assert.equal(isPracticeMode({ shadowModeRemaining: 14 }), true);
});

test("fieldDisplayValue: empty/Unknown → fallback", () => {
  assert.equal(fieldDisplayValue(""), "—");
  assert.equal(fieldDisplayValue(null), "—");
  assert.equal(fieldDisplayValue(undefined), "—");
  assert.equal(fieldDisplayValue("Unknown"), "—");
  assert.equal(fieldDisplayValue("unknown"), "—");
  assert.equal(fieldDisplayValue("  "), "—");
});

test("fieldDisplayValue: real value passes through", () => {
  assert.equal(fieldDisplayValue("John Smith"), "John Smith");
  assert.equal(fieldDisplayValue("  trimmed  "), "trimmed");
});

test("safeRevenueDisplay: null when not connected", () => {
  assert.equal(safeRevenueDisplay(500_00, false), null);
});

test("safeRevenueDisplay: null when cents undefined", () => {
  assert.equal(safeRevenueDisplay(undefined, true), null);
});

test("safeRevenueDisplay: formatted when connected + data", () => {
  const result = safeRevenueDisplay(500_00, true);
  assert.ok(result !== null);
  assert.ok(result.startsWith("$"));
});
