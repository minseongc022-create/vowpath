type GapSettings = {
  slotBufferMinutes?: number;
  travelMinutes?: number;
};

function clampMinutes(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(0, n));
}

/** Wrap-up + drive time between visits (minutes). */
export function schedulingGapMinutes(settings: GapSettings): number {
  return (
    clampMinutes(settings.slotBufferMinutes, 30, 480) +
    clampMinutes(settings.travelMinutes, 30, 240)
  );
}

/** Wrap-up + drive time between visits (milliseconds). */
export function schedulingGapMs(settings: GapSettings): number {
  return schedulingGapMinutes(settings) * 60_000;
}

/** Earliest slot start after a visit ends (visit end + gap). */
export function earliestStartAfterVisit(
  visitEndMs: number,
  gapMs: number,
): number {
  return visitEndMs + Math.max(0, gapMs);
}

/** Collect candidate starts right after existing bookings/blocks clear travel gap. */
export function travelReleaseStarts(
  laneBookings: { endAt: string }[],
  externalBlocks: { endAt: string }[],
  gapMs: number,
): number[] {
  const starts: number[] = [];
  for (const b of laneBookings) {
    starts.push(earliestStartAfterVisit(new Date(b.endAt).getTime(), gapMs));
  }
  for (const block of externalBlocks) {
    starts.push(earliestStartAfterVisit(new Date(block.endAt).getTime(), gapMs));
  }
  return starts;
}

const START_TOLERANCE_MS = 5 * 60_000;

/** Merge fixed grid starts with post-visit travel releases (deduped). */
export function mergeSlotStartTimes(
  fixedStarts: number[],
  dynamicStarts: number[],
  durationMs: number,
  windowEndMs: number,
): number[] {
  const merged = [
    ...fixedStarts,
    ...dynamicStarts.filter((t) => t + durationMs <= windowEndMs),
  ];
  merged.sort((a, b) => a - b);
  const out: number[] = [];
  for (const t of merged) {
    if (out.length && t - out[out.length - 1] < START_TOLERANCE_MS) continue;
    out.push(t);
  }
  return out;
}
