import type { TechDispatchSettings, TechMember } from "./types";
import { dayOfWeekInTimezone } from "../us-timezone";
import { DEFAULT_SHOP_TIMEZONE } from "../us-timezone";

type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export function weekdayKeyForDate(date = new Date(), timeZone = DEFAULT_SHOP_TIMEZONE): WeekdayKey {
  return String(dayOfWeekInTimezone(timeZone, date)) as WeekdayKey;
}

/** Prefer scheduled on-call tech for today; fall back to round-robin pool. */
export function resolveOnCallTech(
  settings: TechDispatchSettings,
  pool: TechMember[],
  timeZone = DEFAULT_SHOP_TIMEZONE,
): TechMember | null {
  if (!pool.length) return null;

  const key = weekdayKeyForDate(undefined, timeZone);
  const onCallId = settings.onCallByWeekday?.[key];
  if (onCallId) {
    const scheduled = pool.find((t) => t.id === onCallId);
    if (scheduled) return scheduled;
  }

  return pool[0];
}

export function orderPoolWithOnCall(
  settings: TechDispatchSettings,
  pool: TechMember[],
  timeZone = DEFAULT_SHOP_TIMEZONE,
): TechMember[] {
  const primary = resolveOnCallTech(settings, pool, timeZone);
  if (!primary) return pool;
  return [primary, ...pool.filter((t) => t.id !== primary.id)];
}
