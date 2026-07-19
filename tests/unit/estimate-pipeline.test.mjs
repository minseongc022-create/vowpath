import assert from "node:assert/strict";
import test from "node:test";

/** Mirror estimate pipeline helpers without importing TS module graph. */
function isEstimateJob(job) {
  if (job.requestKind === "estimate") return true;
  const window = (job.arrivalWindow ?? "").toLowerCase();
  if (window.includes("estimate") || window.includes("quote")) return true;
  const symptom = (job.symptom ?? "").toLowerCase();
  return symptom.startsWith("estimate:") || symptom.includes("estimate request");
}

function quoteSentBody({ shopName, customerName, amountCents }) {
  const first = (customerName ?? "there").trim().split(/\s+/)[0] || "there";
  const amount = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return `${shopName}: Hi ${first} — your estimate is ${amount}.`;
}

test("flags estimate jobs by requestKind and window copy", () => {
  assert.equal(
    isEstimateJob({
      requestKind: "estimate",
      arrivalWindow: "Tonight",
      symptom: "Water",
    }),
    true,
  );
  assert.equal(
    isEstimateJob({
      requestKind: "service",
      arrivalWindow: "Free estimate request — quote & schedule with customer",
      symptom: "Basement",
    }),
    true,
  );
  assert.equal(
    isEstimateJob({
      requestKind: "service",
      arrivalWindow: "Tonight · on-call",
      symptom: "No heat",
    }),
    false,
  );
});

test("quote-sent SMS includes amount and first name", () => {
  const body = quoteSentBody({
    shopName: "Dry Out Pros",
    customerName: "Sarah Mitchell",
    amountCents: 450_000,
  });
  assert.match(body, /Dry Out Pros/);
  assert.match(body, /Sarah/);
  assert.match(body, /\$4,500/);
});
