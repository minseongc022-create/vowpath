import assert from "node:assert/strict";
import test from "node:test";

import { matchPreferredVisitSlot } from "../../lib/scheduling/match-preferred-slot.ts";

function sampleGrid() {
  return {
    days: [
      {
        date: "2026-07-20",
        weekdayLabel: "Mon",
        monthDayLabel: "Jul 20",
        slots: [
          {
            id: "2026-07-20-10-0",
            startAt: "2026-07-20T14:00:00.000Z",
            endAt: "2026-07-20T15:00:00.000Z",
            label: "10:00 AM – 11:00 AM",
            status: "available",
            source: "native",
            lanesOpen: 1,
          },
          {
            id: "2026-07-20-11-0",
            startAt: "2026-07-20T15:00:00.000Z",
            endAt: "2026-07-20T16:00:00.000Z",
            label: "11:00 AM – 12:00 PM",
            status: "blocked",
            source: "native",
            lanesOpen: 0,
          },
        ],
      },
    ],
    durationMinutes: 60,
    bufferMinutes: 0,
    travelMinutes: 0,
    maxConcurrentVisits: 1,
    timeZone: "America/New_York",
  };
}

test("matchPreferredVisitSlot: available when time matches", () => {
  const match = matchPreferredVisitSlot({
    grid: sampleGrid(),
    source: "native",
    preferredDate: "2026-07-20",
    preferredTime: "10:00",
  });
  assert.equal(match?.status, "available");
  if (match?.status === "available") {
    assert.equal(match.slot.id, "2026-07-20-10-0");
  }
});

test("matchPreferredVisitSlot: blocked offers next available", () => {
  const match = matchPreferredVisitSlot({
    grid: sampleGrid(),
    source: "native",
    preferredDate: "2026-07-20",
    preferredTime: "11:00",
  });
  assert.equal(match?.status, "blocked");
  if (match && match.status === "blocked") {
    assert.equal(match.nextAvailable, null);
  }
});
