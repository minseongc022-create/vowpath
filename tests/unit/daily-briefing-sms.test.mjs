import assert from "node:assert/strict";
import test from "node:test";

import { isBriefingSmsSendWindow } from "../../lib/briefing-sms-window.ts";

test("isBriefingSmsSendWindow: matches configured hour in Eastern time", () => {
  const eightAmEt = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(isBriefingSmsSendWindow("08:00", eightAmEt, "America/New_York"), true);
  assert.equal(isBriefingSmsSendWindow("09:00", eightAmEt, "America/New_York"), false);
});

test("isBriefingSmsSendWindow: rejects invalid schedule", () => {
  assert.equal(isBriefingSmsSendWindow("", new Date()), false);
  assert.equal(isBriefingSmsSendWindow("25:00", new Date()), false);
});
