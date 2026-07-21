import assert from "node:assert/strict";
import test from "node:test";

function buildRetellOpeningLine(ivrPath) {
  switch (ivrPath) {
    case "booking_choice":
      return (
        "Great — thanks for calling {{shop_name}}! " +
        "Would you like a quick text link, or handle it on this call?"
      );
    case "estimate_choice":
      return (
        "Awesome — I'd love to help with your free estimate at {{shop_name}}! " +
        "Would you like a quick text link, or tell us about the project on this call?"
      );
    case "phone_booking":
      return "I'm right here with you — let's get this handled. What's your name?";
    case "phone_estimate":
      return "Happy to help with your estimate! What's your name?";
    default:
      return (
        "Hi — thanks for calling {{shop_name}}! " +
        "Are you calling to book service or report an emergency, or for a free estimate?"
      );
  }
}

function isEstimateRetellPath(ivrPath) {
  return ivrPath === "estimate_choice" || ivrPath === "phone_estimate";
}

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
