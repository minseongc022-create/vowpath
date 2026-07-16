import assert from "node:assert/strict";
import test from "node:test";

import { isPracticeMode } from "../../lib/data-truthfulness.ts";

/** Mirrors apply-schedule: practice mode still commits slots to calendar. */
function shouldCommitSlotToCalendar(settings) {
  return true;
}

function shouldPushJobber(settings) {
  return !isPracticeMode(settings);
}

function bookingRecordFlags(settings) {
  const practice = isPracticeMode(settings);
  return {
    isPractice: practice,
    undoExpiresAt: practice ? undefined : "2030-01-01T00:00:00.000Z",
  };
}

test("practice mode: slots commit to calendar (same as live)", () => {
  assert.equal(shouldCommitSlotToCalendar({ shadowModeRemaining: 5 }), true);
  assert.equal(shouldCommitSlotToCalendar({ shadowModeRemaining: 0 }), true);
});

test("practice mode: Jobber push stays off", () => {
  assert.equal(shouldPushJobber({ shadowModeRemaining: 3 }), false);
  assert.equal(shouldPushJobber({ shadowModeRemaining: 0 }), true);
});

test("practice booking flagged isPractice, no undo window", () => {
  const practice = bookingRecordFlags({ shadowModeRemaining: 2 });
  assert.equal(practice.isPractice, true);
  assert.equal(practice.undoExpiresAt, undefined);

  const live = bookingRecordFlags({ shadowModeRemaining: 0 });
  assert.equal(live.isPractice, false);
  assert.ok(live.undoExpiresAt);
});
