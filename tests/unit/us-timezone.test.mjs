import assert from "node:assert/strict";
import test from "node:test";

import {
  minutesSinceMidnightInTimezone,
  weekdayShortInTimezone,
  dayOfWeekInTimezone,
  dateKeyInTimezone,
} from "../../lib/us-timezone.ts";

test("minutesSinceMidnightInTimezone: noon Eastern", () => {
  const noonUtc = new Date("2026-07-13T16:00:00.000Z");
  assert.equal(minutesSinceMidnightInTimezone("America/New_York", noonUtc), 12 * 60);
});

test("weekdayShortInTimezone: matches arrival-window weekday prefix", () => {
  const mondayUtc = new Date("2026-07-13T12:00:00.000Z");
  assert.equal(weekdayShortInTimezone("America/New_York", mondayUtc), "Mon");
});

test("dayOfWeekInTimezone: Monday in Eastern", () => {
  const mondayUtc = new Date("2026-07-13T12:00:00.000Z");
  assert.equal(dayOfWeekInTimezone("America/New_York", mondayUtc), 1);
});

test("dateKeyInTimezone: shop-local calendar date", () => {
  const lateUtc = new Date("2026-07-14T03:00:00.000Z");
  assert.equal(dateKeyInTimezone("America/New_York", lateUtc), "2026-07-13");
});
