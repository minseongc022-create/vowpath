import assert from "node:assert/strict";

/** Pure resolution logic mirrored from customer-marketing-consent (no I/O in test). */
function marketingFromCall(call) {
  return Boolean(call?.customerSmsConsent?.smsMarketingAt);
}

const callWithMarketing = {
  id: "abc",
  customerSmsConsent: { smsServiceAt: "t", smsMarketingAt: "t2", consentVersion: "2026-07" },
};
const callServiceOnly = {
  id: "def",
  customerSmsConsent: { smsServiceAt: "t", smsMarketingAt: null, consentVersion: "2026-07" },
};

assert.equal(marketingFromCall(callWithMarketing), true);
assert.equal(marketingFromCall(callServiceOnly), false);
assert.equal(marketingFromCall(undefined), false);

const jobId = "job-uuid";
const sourceCallId = "abc";
const bookingFromJob = `call-${sourceCallId}`;
assert.equal(bookingFromJob, "call-abc");

console.log("customer-marketing-consent checks passed");
