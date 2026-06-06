import type { ShopBookingSettings, SlotOffer } from "../booking-settings";

export type BusyBlock = {
  startAt: string;
  endAt: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatWindowLabel(start: Date, end: Date): string {
  const day = DAY_NAMES[start.getDay()];
  const h1 = start.getHours();
  const h2 = end.getHours();
  const ap1 = h1 >= 12 ? "pm" : "am";
  const ap2 = h2 >= 12 ? "pm" : "am";
  const h1s = h1 % 12 || 12;
  const h2s = h2 % 12 || 12;
  return `${day} ${h1s}${ap1}–${h2s}${ap2}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeAvailableSlots(params: {
  settings: ShopBookingSettings;
  busyBlocks: BusyBlock[];
  priority: "P1" | "P2" | "P3";
  now?: Date;
  source: "jobber" | "native";
}): SlotOffer[] {
  const { settings, busyBlocks, priority, source } = params;
  const now = params.now ?? new Date();
  const maxOffers = Math.min(5, Math.max(1, settings.slotOfferCount));
  const durationMs = settings.defaultDurationMinutes * 60_000;
  const bufferMs = settings.slotBufferMinutes * 60_000;
  const offers: SlotOffer[] = [];
  const startDayOffset = priority === "P1" ? 0 : 1;

  for (let d = startDayOffset; d < 14 + startDayOffset && offers.length < maxOffers; d++) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + d);
    if (day.getDay() === 0) continue;

    const windows = [
      { startH: settings.amWindowStart, endH: settings.amWindowEnd },
      { startH: settings.pmWindowStart, endH: settings.pmWindowEnd },
    ];

    for (const tmpl of windows) {
      if (offers.length >= maxOffers) break;
      const slotStart = new Date(day);
      slotStart.setHours(tmpl.startH, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      if (slotStart.getTime() < now.getTime() + 3_600_000 && d === 0) continue;

      const startMs = slotStart.getTime();
      const endMs = slotEnd.getTime() + bufferMs;
      const blocked = busyBlocks.some((b) => {
        const bStart = new Date(b.startAt).getTime();
        const bEnd = new Date(b.endAt).getTime() + bufferMs;
        return overlaps(startMs, endMs, bStart, bEnd);
      });
      if (blocked) continue;

      offers.push({
        id: `slot-${offers.length + 1}`,
        label: formatWindowLabel(slotStart, slotEnd),
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        source,
      });
    }
  }

  return offers.slice(0, maxOffers);
}
