import { localToIso } from "@/giu/lib/format";
import { marketTimeZone } from "@/giu/lib/market";
import type { GiuMarket } from "@/giu/lib/types";

export const PUBLISH_HOURS = Array.from({ length: 18 }, (_, i) => i + 6);

const DEFAULT_WINDOWS: Array<[number, number]> = [
  [12, 14],
  [14, 16],
  [16, 18],
  [18, 20],
];

function dateKey(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone });
}

export function dayOffsetFromIso(iso: string, market: GiuMarket = "kr"): number {
  const tz = marketTimeZone(market);
  const now = new Date();
  const todayKey = dateKey(now.toISOString(), tz);
  const pickKey = dateKey(iso, tz);
  if (pickKey === todayKey) return 0;
  const tomorrow = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (pickKey === dateKey(tomorrow.toISOString(), tz)) return 1;
  return 0;
}

export function hourFromIso(iso: string, market: GiuMarket = "kr"): number {
  const tz = marketTimeZone(market);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(
      new Date(iso),
    ),
  );
  return Number.isFinite(hour) ? hour : 12;
}

export function buildPickupWindow(
  dayOffset: number,
  startH: number,
  endH: number,
  market: GiuMarket = "kr",
): { pickupStart: string; pickupEnd: string; expiresAt: string } {
  const tz = marketTimeZone(market);
  const pickupStart = localToIso(dayOffset, startH, 0, tz);
  const pickupEnd = localToIso(dayOffset, endH, 0, tz);
  return { pickupStart, pickupEnd, expiresAt: pickupEnd };
}

export function isPickupWindowInFuture(
  pickupEnd: string,
  now = Date.now(),
): boolean {
  return new Date(pickupEnd).getTime() > now;
}

/** Pick a valid republish window when the source listing is already past. */
export function republishScheduleFromBox(
  box: { pickupStart: string; pickupEnd: string },
  market: GiuMarket = "kr",
  now = Date.now(),
): { dayOffset: number; startH: number; endH: number } {
  if (isPickupWindowInFuture(box.pickupEnd, now)) {
    return {
      dayOffset: dayOffsetFromIso(box.pickupStart, market),
      startH: hourFromIso(box.pickupStart, market),
      endH: hourFromIso(box.pickupEnd, market),
    };
  }

  for (const dayOffset of [0, 1]) {
    for (const [startH, endH] of DEFAULT_WINDOWS) {
      const win = buildPickupWindow(dayOffset, startH, endH, market);
      if (isPickupWindowInFuture(win.pickupEnd, now)) {
        return { dayOffset, startH, endH };
      }
    }
  }

  return { dayOffset: 1, startH: 12, endH: 14 };
}
