import assert from "node:assert/strict";
import test from "node:test";

import { minutesSinceMidnightInTimezone, dayOfWeekInTimezone } from "../../lib/us-timezone.ts";

/** Inline schedule row check (same rules as missed-calls-prevented). */
function isWithinScheduleRow(iso, row, timeZone) {
  const d = new Date(iso);
  const mins = minutesSinceMidnightInTimezone(timeZone, d);
  const startMins = row.startHour * 60 + row.startMinute;
  const endMins = row.endHour * 60 + row.endMinute;
  const day = dayOfWeekInTimezone(timeZone, d);
  if (!row.days.includes(day)) return false;
  return mins >= startMins && mins < endMins;
}

const weekdayRow = {
  days: [1, 2, 3, 4, 5],
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 0,
};

test("AI schedule row respects shop timezone", () => {
  const iso = "2026-07-13T13:00:00.000Z";
  assert.equal(isWithinScheduleRow(iso, weekdayRow, "America/New_York"), true);
  assert.equal(isWithinScheduleRow(iso, weekdayRow, "America/Los_Angeles"), false);
});
