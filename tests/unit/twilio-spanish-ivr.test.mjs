import assert from "node:assert/strict";
import test from "node:test";

function isSpanishIvrEnabled() {
  return process.env.TWILIO_SPANISH_IVR === "true";
}

test("isSpanishIvrEnabled: off by default", () => {
  delete process.env.TWILIO_SPANISH_IVR;
  assert.equal(isSpanishIvrEnabled(), false);
});

test("isSpanishIvrEnabled: on when TWILIO_SPANISH_IVR=true", () => {
  process.env.TWILIO_SPANISH_IVR = "true";
  assert.equal(isSpanishIvrEnabled(), true);
  delete process.env.TWILIO_SPANISH_IVR;
});
