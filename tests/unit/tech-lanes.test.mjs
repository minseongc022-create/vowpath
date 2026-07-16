import assert from "node:assert/strict";
import test from "node:test";

import {
  countLanesInUse,
  lanesAvailableAt,
  pickFreeTechForWindow,
  schedulingLeadMs,
  maxSlotOffersForPriority,
} from "../../lib/scheduling/lane-capacity.ts";

test("lanes: three crew — two bookings leave one lane", () => {
  const bookings = [
    {
      bookingId: "a",
      startAt: "2026-07-15T14:00:00.000Z",
      endAt: "2026-07-15T16:00:00.000Z",
      assignedTechId: "t1",
    },
    {
      bookingId: "b",
      startAt: "2026-07-15T14:00:00.000Z",
      endAt: "2026-07-15T16:00:00.000Z",
      assignedTechId: null,
    },
  ];
  const start = new Date("2026-07-15T14:00:00.000Z").getTime();
  const end = new Date("2026-07-15T16:00:00.000Z").getTime();
  assert.equal(countLanesInUse(start, end, 0, bookings, []), 2);
  assert.equal(lanesAvailableAt(start, end, 0, 3, bookings, []), 1);
});

test("P1 emergencies use shorter lead time", () => {
  assert.equal(schedulingLeadMs("P1"), 20 * 60_000);
  assert.equal(schedulingLeadMs("P2"), 60 * 60_000);
  assert.equal(maxSlotOffersForPriority("P1", 2), 4);
  assert.equal(maxSlotOffersForPriority("P2", 2), 2);
});

test("pickFreeTechForWindow prefers tech with lighter load", () => {
  const techs = [
    { id: "t1", name: "Alex", phone: "1", active: true },
    { id: "t2", name: "Blake", phone: "2", active: true },
  ];
  const laneBookings = [
    {
      bookingId: "a",
      startAt: "2026-07-14T10:00:00.000Z",
      endAt: "2026-07-14T12:00:00.000Z",
      assignedTechId: "t1",
    },
  ];
  const start = new Date("2026-07-15T14:00:00.000Z").getTime();
  const end = new Date("2026-07-15T16:00:00.000Z").getTime();
  const picked = pickFreeTechForWindow({
    techs,
    startMs: start,
    endMs: end,
    bufferMs: 0,
    laneBookings,
  });
  assert.equal(picked?.id, "t2");
});
