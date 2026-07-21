import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRetellOpeningLine,
  isEstimateRetellPath,
} from "../../lib/retell-opening-line.ts";

function resolveRetellAgentIdForIvrPath(env, ivrPath) {
  const booking = env.RETELL_AGENT_ID?.trim() || "agent_booking_default";
  const estimate = env.RETELL_ESTIMATE_AGENT_ID?.trim();
  if (ivrPath === "estimate_choice" || ivrPath === "phone_estimate") {
    return estimate || booking;
  }
  return booking;
}

test("buildRetellOpeningLine: booking_choice asks link vs phone", () => {
  const line = buildRetellOpeningLine("booking_choice");
  assert.match(line, /text link/i);
  assert.match(line, /this call/i);
  assert.match(line, /\{\{shop_name\}\}/);
  assert.match(line, /glad you reached/i);
});

test("buildRetellOpeningLine: estimate_choice uses estimate tone", () => {
  const line = buildRetellOpeningLine("estimate_choice");
  assert.match(line, /free estimate/i);
  assert.match(line, /text link/i);
});

test("buildRetellOpeningLine: phone_booking skips link question", () => {
  const line = buildRetellOpeningLine("phone_booking");
  assert.match(line, /name/i);
  assert.doesNotMatch(line, /text link/i);
  assert.match(line, /right here with you/i);
});

test("isEstimateRetellPath", () => {
  assert.equal(isEstimateRetellPath("estimate_choice"), true);
  assert.equal(isEstimateRetellPath("phone_estimate"), true);
  assert.equal(isEstimateRetellPath("booking_choice"), false);
});

test("resolveRetellAgentIdForIvrPath: estimate paths use estimate agent", () => {
  assert.equal(
    resolveRetellAgentIdForIvrPath(
      { RETELL_AGENT_ID: "agent_a", RETELL_ESTIMATE_AGENT_ID: "agent_b" },
      "estimate_choice",
    ),
    "agent_b",
  );
});

test("resolveRetellAgentIdForIvrPath: booking paths use booking agent", () => {
  assert.equal(
    resolveRetellAgentIdForIvrPath(
      { RETELL_AGENT_ID: "agent_a", RETELL_ESTIMATE_AGENT_ID: "agent_b" },
      "booking_choice",
    ),
    "agent_a",
  );
});
