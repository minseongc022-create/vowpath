import assert from "node:assert/strict";
import {
  isChaseDue,
  isInChaseQueue,
  isOpenQuote,
  quotePipelineStage,
  QUOTE_CHASE_INTERVALS_DAYS,
} from "../../lib/quote-chase.ts";

function baseJob(overrides = {}) {
  return {
    id: "j1",
    priority: "P2",
    symptom: "AC estimate",
    customerName: "Pat",
    address: "1 Main St",
    arrivalWindow: "Estimate",
    status: "pending_review",
    createdAt: new Date().toISOString(),
    requestKind: "estimate",
    ...overrides,
  };
}

const sentThreeDaysAgo = new Date();
sentThreeDaysAgo.setDate(sentThreeDaysAgo.getDate() - 3);

const sentYesterday = new Date();
sentYesterday.setDate(sentYesterday.getDate() - 1);

assert.equal(isOpenQuote(baseJob({ requestKind: "estimate" })), true);
assert.equal(isOpenQuote(baseJob({ quotedAmountCents: 50000, quotedAt: new Date().toISOString() })), true);
assert.equal(
  isOpenQuote(
    baseJob({
      quoteSentToCustomerAt: sentThreeDaysAgo.toISOString(),
      quotedAmountCents: 50000,
    }),
  ),
  false,
);

assert.equal(
  isInChaseQueue(
    baseJob({
      quoteSentToCustomerAt: sentThreeDaysAgo.toISOString(),
      quotedAmountCents: 50000,
    }),
  ),
  true,
);

assert.equal(
  isChaseDue(
    baseJob({
      quoteSentToCustomerAt: sentThreeDaysAgo.toISOString(),
      quotedAmountCents: 50000,
    }),
  ),
  true,
);

assert.equal(
  isChaseDue(
    baseJob({
      quoteSentToCustomerAt: sentYesterday.toISOString(),
      quotedAmountCents: 50000,
    }),
  ),
  false,
);

assert.equal(QUOTE_CHASE_INTERVALS_DAYS.length, 3);
assert.equal(quotePipelineStage(baseJob({ status: "scheduled" })), "booked");

console.log("quote-chase.test.mjs OK");
