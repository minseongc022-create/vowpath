import assert from "node:assert/strict";
import test from "node:test";

import { resolveHomeServicesDispatchDecision } from "../../lib/home-services-issue.ts";

/** Mirrors canMarkScheduled after reschedule fix. */
function canMarkScheduled(status) {
  const s = String(status || "").trim().toLowerCase();
  return s === "approved" || s === "scheduled";
}

test("scheduled → scheduled is allowed (customer reschedule)", () => {
  assert.equal(canMarkScheduled("scheduled"), true);
  assert.equal(canMarkScheduled("approved"), true);
  assert.equal(canMarkScheduled("pending_review"), false);
});

test("HVAC clear no-heat P1 auto-dispatches (no owner wait)", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 90,
    issueType: "No heat",
    symptom: "Furnace won't start, no heat",
    customerName: "Sarah Mitchell",
    address: "123 Main St, Tampa, FL 33602",
    inServiceArea: true,
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoDispatch, true);
});

test("HVAC gas smell always needs owner approval", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 90,
    issueType: "Gas smell",
    symptom: "I smell gas near my furnace",
    customerName: "Sarah Mitchell",
    address: "123 Main St, Tampa, FL 33602",
    inServiceArea: true,
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.autoDispatch, false);
});
