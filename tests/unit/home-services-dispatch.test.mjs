import test from "node:test";
import assert from "node:assert/strict";
import { resolveHomeServicesDispatchDecision } from "../../lib/home-services-issue.ts";
import { resolveBookingGateForVertical } from "../../lib/auto-book-gate.ts";

// ─── HVAC ───────────────────────────────────────────────────────────────────

test("hvac: P1 no-heat + verified address → auto dispatch", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 90,
    issueType: "No heat — furnace not working",
    symptom: "No heat",
    customerName: "John Smith",
    address: "123 Main Street Austin TX 78701",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoDispatch, true);
  assert.equal(d.isUrgentAlert, true);
});

test("hvac: gas smell → owner hold, urgent", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 95,
    issueType: "Gas smell near furnace",
    symptom: "Gas odor",
    customerName: "Jane Doe",
    address: "456 Oak Ave Austin TX 78702",
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isUrgentAlert, true);
  assert.ok(d.reasons.some((r) => r.includes("safety_hold")));
});

test("hvac: sparking → owner hold", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 90,
    issueType: "Sparking outlet near HVAC panel",
    symptom: "Sparking",
    customerName: "Bob Jones",
    address: "789 Pine St Houston TX 77001",
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isUrgentAlert, true);
});

test("hvac: confidence < 65 → needs_review even for P1", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 50,
    issueType: "No heat",
    symptom: "No heat",
    customerName: "Unknown",
    address: "Unknown",
  });
  assert.equal(d.needsOwnerApproval, true);
  assert.equal(d.isAmbiguous, true);
});

test("hvac: P2 clear → auto confirm", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P2",
    confidenceMin: 85,
    issueType: "AC making noise",
    symptom: "Strange noise",
    customerName: "Mike Brown",
    address: "222 Elm St Dallas TX 75201",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoDispatch, false);
});

test("hvac: no-cool P1 + verified → auto dispatch", () => {
  const d = resolveHomeServicesDispatchDecision({
    vertical: "hvac",
    priority: "P1",
    confidenceMin: 88,
    issueType: "AC not cooling",
    symptom: "No cool",
    customerName: "Sarah Lee",
    address: "555 Maple Ave Phoenix AZ 85001",
  });
  assert.equal(d.needsOwnerApproval, false);
  assert.equal(d.autoDispatch, true);
});

// ─── RESTORATION REGRESSION (via vertical-aware gate) ────────────────────────

test("restoration: clear P1 water → auto_confirm gate (regression)", () => {
  const gate = resolveBookingGateForVertical("restoration", {
    priority: "P1",
    confidenceMin: 99,
    lossCategory: "water",
    customerName: "Jane Doe",
    address: "123 Main Street Austin TX 78701",
  });
  assert.equal(gate, "auto_confirm");
});

test("restoration: P1 fire → urgent_review gate (regression)", () => {
  const gate = resolveBookingGateForVertical("restoration", {
    priority: "P1",
    confidenceMin: 99,
    lossCategory: "fire",
    customerName: "Jane Doe",
    address: "123 Main Street Austin TX 78701",
  });
  assert.equal(gate, "urgent_review");
});

test("hvac gate: gas smell → urgent_review", () => {
  const gate = resolveBookingGateForVertical("hvac", {
    priority: "P1",
    confidenceMin: 95,
    issueType: "Gas smell near furnace",
    symptom: "Gas odor",
    customerName: "Bob Test",
    address: "123 Main St Austin TX 78701",
  });
  assert.equal(gate, "urgent_review");
});

test("hvac gate: P1 no-heat verified → auto_confirm", () => {
  const gate = resolveBookingGateForVertical("hvac", {
    priority: "P1",
    confidenceMin: 90,
    issueType: "No heat furnace not working",
    symptom: "No heat",
    customerName: "John Smith",
    address: "456 Oak Ave Dallas TX 75201",
  });
  assert.equal(gate, "auto_confirm");
});
