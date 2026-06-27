import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveBookingGate,
  isAmbiguousIntake,
  AUTO_BOOK_CONFIDENCE_MIN,
} from "../../lib/auto-book-gate.ts";

test("clear P1 water → auto_confirm", () => {
  assert.equal(
    resolveBookingGate({
      priority: "P1",
      confidenceMin: 99,
      lossCategory: "water",
      customerName: "Jane Doe",
      address: "123 Main Street Austin TX 78701",
    }),
    "auto_confirm",
  );
});

test("P1 fire → urgent_review", () => {
  assert.equal(
    resolveBookingGate({
      priority: "P1",
      confidenceMin: 99,
      lossCategory: "fire",
      customerName: "Jane Doe",
      address: "123 Main Street Austin TX 78701",
    }),
    "urgent_review",
  );
});

test("ambiguous address → needs_review", () => {
  assert.equal(
    resolveBookingGate({
      priority: "P2",
      confidenceMin: 50,
      lossCategory: "water",
      customerName: "Mike",
      address: "123 Main St Austin TX",
    }),
    "needs_review",
  );
});

test("clear P2 → auto_confirm", () => {
  assert.equal(
    resolveBookingGate({
      priority: "P2",
      confidenceMin: 80,
      lossCategory: "water",
      customerName: "Mike Smith",
      address: "123 Main Street Austin TX 78701",
    }),
    "auto_confirm",
  );
});

test("isAmbiguousIntake threshold", () => {
  assert.equal(
    isAmbiguousIntake({
      confidenceMin: AUTO_BOOK_CONFIDENCE_MIN,
      customerName: "Jane",
      address: "456 Oak Ave Austin TX 78701",
    }),
    false,
  );
});
