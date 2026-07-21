import assert from "node:assert/strict";
import test from "node:test";

function billableMinutesFromDurationSec(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  return Math.ceil(durationSec / 60);
}

function overageMinutesFromCall(included, minutesBeforeCall, callMinutes) {
  if (callMinutes <= 0) return 0;
  const after = minutesBeforeCall + callMinutes;
  if (after <= included) return 0;
  if (minutesBeforeCall >= included) return callMinutes;
  return after - included;
}

function usageThreshold(used, included) {
  if (included <= 0) return null;
  const ratio = used / included;
  if (ratio >= 1) return 100;
  if (ratio >= 0.8) return 80;
  return null;
}

test("voice overage and alert thresholds", () => {
  assert.equal(billableMinutesFromDurationSec(61), 2);
  assert.equal(overageMinutesFromCall(250, 248, 5), 3);
  assert.equal(usageThreshold(199, 250), null);
  assert.equal(usageThreshold(200, 250), 80);
  assert.equal(usageThreshold(250, 250), 100);
  assert.equal(usageThreshold(251, 250), 100);
});

test("plan display names for voice ids", () => {
  const names = {
    voice_starter: "Voice Starter",
    voice_pro: "Voice Pro",
    flex: "Flex",
  };
  assert.equal(names.voice_starter, "Voice Starter");
  assert.equal(names.voice_pro, "Voice Pro");
});
