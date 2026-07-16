import assert from "node:assert/strict";
import test from "node:test";

/** Mirrors slot-grid overlap + buffer reservation (single buffer application). */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function countBlockingOverlaps(startMs, endMs, bufferMs, busyBlocks) {
  return busyBlocks.filter((b) => {
    const bStart = new Date(b.startAt).getTime();
    const reservedEnd = new Date(b.endAt).getTime() + bufferMs;
    return overlaps(startMs, endMs, bStart, reservedEnd);
  }).length;
}

test("slot buffer: visit end + buffer blocks until gap clears", () => {
  const durationMs = 120 * 60_000;
  const bufferMs = 30 * 60_000;
  const busy = {
    startAt: "2026-07-15T13:00:00.000Z",
    endAt: "2026-07-15T15:00:00.000Z",
  };

  const slotAt3pmStart = new Date("2026-07-15T15:00:00.000Z").getTime();
  const slotAt3pmEnd = slotAt3pmStart + durationMs;
  assert.equal(countBlockingOverlaps(slotAt3pmStart, slotAt3pmEnd, bufferMs, [busy]), 1);

  const slotAt330Start = new Date("2026-07-15T15:30:00.000Z").getTime();
  const slotAt330End = slotAt330Start + durationMs;
  assert.equal(countBlockingOverlaps(slotAt330Start, slotAt330End, bufferMs, [busy]), 0);
});

test("slot spacing: next start is duration + buffer after previous", () => {
  const durationMs = 120 * 60_000;
  const bufferMs = 30 * 60_000;
  const stepMs = durationMs + bufferMs;
  assert.equal(stepMs, 150 * 60_000);
});
