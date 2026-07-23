import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAutoBookDecision,
  confidenceMinFromFields,
  shouldSendOwnerApprovalSms,
  AUTO_BOOK_CONFIDENCE_MIN,
} from "../../lib/auto-book-policy.ts";

test("clear P1 water auto-dispatches without owner approval", () => {
  const d = resolveAutoBookDecision({
    priority: "P1",
    confidenceMin: 95,
    lossCategory: "water",
    customerName: "Jane Doe",
    address: "123 Main St, Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoWaterDispatch, true);
  assert.equal(d.isUrgentAlert, true);
});

test("P1 fire needs owner approval", () => {
  const d = resolveAutoBookDecision({
    priority: "P1",
    confidenceMin: 95,
    lossCategory: "fire",
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isUrgentAlert, true);
});

test("P2 clear intake auto-books", () => {
  const d = resolveAutoBookDecision({
    priority: "P2",
    confidenceMin: 80,
    lossCategory: "water",
    customerName: "Jane",
    address: "123 Main St, Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, false);
});

test("P3 low confidence needs review", () => {
  const d = resolveAutoBookDecision({
    priority: "P3",
    confidenceMin: AUTO_BOOK_CONFIDENCE_MIN - 1,
    lossCategory: "inspection",
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isAmbiguous, true);
});

test("confidenceMinFromFields uses minimum field", () => {
  const min = confidenceMinFromFields({
    customerName: 90,
    address: 55,
    serviceLocation: 88,
    issueType: 92,
  });
  assert.equal(min, 55);
});

test("shouldSendOwnerApprovalSms p1_only skips P2 auto", () => {
  assert.equal(shouldSendOwnerApprovalSms("p1_only", "P2", 90, "water"), false);
  assert.equal(shouldSendOwnerApprovalSms("p1_only", "P1", 90, "fire"), true);
});

test("HVAC no-heat does not use restoration fire/water loss inference path", async () => {
  const { resolveAutoBookDecisionForVertical, shouldSendOwnerApprovalSmsForVertical } =
    await import("../../lib/auto-book-policy.ts");
  const d = resolveAutoBookDecisionForVertical("hvac", {
    priority: "P1",
    confidenceMin: 95,
    issueType: "No heat",
    symptom: "Furnace not heating",
    customerName: "Jane Doe",
    address: "123 Main St, Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.lossCategory, "other");
  assert.equal(
    shouldSendOwnerApprovalSmsForVertical("hvac", "p1_only", {
      priority: "P1",
      confidenceMin: 95,
      issueType: "No heat",
      symptom: "Furnace not heating",
      needsOwnerApproval: true,
    }),
    true,
  );
});

test("HVAC gas smell always holds for owner", async () => {
  const { resolveAutoBookDecisionForVertical } = await import("../../lib/auto-book-policy.ts");
  const d = resolveAutoBookDecisionForVertical("hvac", {
    priority: "P1",
    confidenceMin: 95,
    issueType: "Gas smell",
    symptom: "Smell of gas near furnace",
    customerName: "Jane",
    address: "123 Main St",
  });
  assert.equal(d.needsOwnerApproval, true);
});
