import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveRestorationDispatchDecision,
  inferLossCategoryFromText,
  normalizeLossCategory,
} from "../../lib/loss-category.ts";

test("clear P1 water auto-dispatches", () => {
  const d = resolveRestorationDispatchDecision({
    priority: "P1",
    lossCategory: "water",
    confidenceMin: 95,
    customerName: "Jane Doe",
    address: "123 Main St, Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoWaterDispatch, true);
});

test("P1 fire needs owner approval", () => {
  const d = resolveRestorationDispatchDecision({
    priority: "P1",
    lossCategory: "fire",
    confidenceMin: 95,
    customerName: "Jane Doe",
    address: "123 Main St, Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, true);
});

test("inferLossCategoryFromText water", () => {
  assert.equal(inferLossCategoryFromText("Basement flooding", "Water loss"), "water");
});

test("normalizeLossCategory sewage", () => {
  assert.equal(normalizeLossCategory("sewage backup"), "sewage_cat3");
});
