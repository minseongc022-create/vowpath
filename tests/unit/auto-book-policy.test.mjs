import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAutoBookDecision,
  confidenceMinFromFields,
  shouldSendOwnerApprovalSms,
  AUTO_BOOK_CONFIDENCE_MIN,
} from "../../lib/auto-book-policy.ts";

test("P1 always needs owner approval", () => {
  const d = resolveAutoBookDecision({ priority: "P1", confidenceMin: 95 });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isUrgentAlert, true);
});

test("P2 clear intake auto-books", () => {
  const d = resolveAutoBookDecision({ priority: "P2", confidenceMin: 80 });
  assert.equal(d.needsOwnerApproval, false);
});

test("P3 low confidence needs review", () => {
  const d = resolveAutoBookDecision({
    priority: "P3",
    confidenceMin: AUTO_BOOK_CONFIDENCE_MIN - 1,
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
  assert.equal(
    shouldSendOwnerApprovalSms("p1_only", "P2", 90),
    false,
  );
  assert.equal(
    shouldSendOwnerApprovalSms("p1_only", "P1", 90),
    true,
  );
});
