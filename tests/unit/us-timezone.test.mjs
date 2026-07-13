import assert from "node:assert/strict";
import test from "node:test";

import {
  minutesSinceMidnightInTimezone,
  weekdayShortInTimezone,
} from "../../lib/us-timezone.ts";

test("minutesSinceMidnightInTimezone: noon Eastern", () => {
  const noonUtc = new Date("2026-07-13T16:00:00.000Z");
  assert.equal(minutesSinceMidnightInTimezone("America/New_York", noonUtc), 12 * 60);
});

test("weekdayShortInTimezone: matches arrival-window weekday prefix", () => {
  const mondayUtc = new Date("2026-07-13T12:00:00.000Z");
  assert.equal(weekdayShortInTimezone("America/New_York", mondayUtc), "Mon");
});
