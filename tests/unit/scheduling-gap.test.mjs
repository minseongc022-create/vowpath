import assert from "node:assert/strict";
import test from "node:test";

import {
  earliestStartAfterVisit,
  mergeSlotStartTimes,
  travelReleaseStarts,
} from "../../lib/scheduling/scheduling-gap.ts";
import { countLanesInUse } from "../../lib/scheduling/lane-capacity.ts";

test("travel release: slot after 2h visit + 30m travel opens at 11:30", () => {
  const gapMs = 30 * 60_000;
  const busyEnd = new Date("2026-07-15T15:00:00.000Z").getTime();
  assert.equal(earliestStartAfterVisit(busyEnd, gapMs), busyEnd + gapMs);

  const starts = travelReleaseStarts(
    [{ endAt: "2026-07-15T15:00:00.000Z" }],
    [],
    gapMs,
  );
  assert.equal(starts[0], new Date("2026-07-15T15:30:00.000Z").getTime());
});

test("mergeSlotStartTimes adds post-visit slot not on fixed grid", () => {
  const durationMs = 120 * 60_000;
  const windowEnd = new Date("2026-07-15T20:00:00.000Z").getTime();
  const fixed = [new Date("2026-07-15T13:00:00.000Z").getTime()];
  const dynamic = [new Date("2026-07-15T15:30:00.000Z").getTime()];
  const merged = mergeSlotStartTimes(fixed, dynamic, durationMs, windowEnd);
  assert.equal(merged.length, 2);
  assert.equal(merged[1], dynamic[0]);
});

test("lanes: visit end + travel blocks overlapping slot", () => {
  const gapMs = 30 * 60_000;
  const bookings = [
    {
      bookingId: "a",
      startAt: "2026-07-15T13:00:00.000Z",
      endAt: "2026-07-15T15:00:00.000Z",
      assignedTechId: "t1",
    },
  ];
  const slot330 = new Date("2026-07-15T15:00:00.000Z").getTime();
  const slot330End = slot330 + 120 * 60_000;
  assert.equal(countLanesInUse(slot330, slot330End, gapMs, bookings, []), 1);

  const slotAfterTravel = new Date("2026-07-15T15:30:00.000Z").getTime();
  assert.equal(
    countLanesInUse(slotAfterTravel, slotAfterTravel + 120 * 60_000, gapMs, bookings, []),
    0,
  );
});

test("combined gap mirrors wrap-up + travel (45 min total)", () => {
  const wrapUpMs = 15 * 60_000;
  const travelMs = 30 * 60_000;
  const gapMs = wrapUpMs + travelMs;
  const busyEnd = new Date("2026-07-15T15:00:00.000Z").getTime();
  assert.equal(earliestStartAfterVisit(busyEnd, gapMs), busyEnd + 45 * 60_000);
});
