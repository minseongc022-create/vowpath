import type { TechDispatchSettings, TechMember } from "./types";

type WeekdayKey = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export function weekdayKeyForDate(date = new Date()): WeekdayKey {
  return String(date.getDay()) as WeekdayKey;
}

/** Prefer scheduled on-call tech for today; fall back to round-robin pool. */
export function resolveOnCallTech(
  settings: TechDispatchSettings,
  pool: TechMember[],
): TechMember | null {
  if (!pool.length) return null;

  const key = weekdayKeyForDate();
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
): TechMember[] {
  const primary = resolveOnCallTech(settings, pool);
  if (!primary) return pool;
  return [primary, ...pool.filter((t) => t.id !== primary.id)];
}
