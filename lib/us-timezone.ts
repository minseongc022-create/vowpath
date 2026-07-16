/** Default IANA zone for shop-local scheduling until per-tenant timezone is stored. */
export const DEFAULT_SHOP_TIMEZONE =
  process.env.EFFIROAD_DEFAULT_TIMEZONE?.trim() || "America/New_York";

/** Minutes since local midnight in the given IANA timezone. */
export function minutesSinceMidnightInTimezone(
  timeZone = DEFAULT_SHOP_TIMEZONE,
  now = new Date(),
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Three-letter weekday prefix matching arrival-window labels (Mon, Tue, …). */
export function weekdayShortInTimezone(
  timeZone = DEFAULT_SHOP_TIMEZONE,
  now = new Date(),
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
    .format(now)
    .slice(0, 3);
}

/** 0=Sun … 6=Sat in the given IANA timezone. */
export function dayOfWeekInTimezone(
  timeZone = DEFAULT_SHOP_TIMEZONE,
  now = new Date(),
): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
    .format(now)
    .slice(0, 3);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? now.getDay();
}

/** YYYY-MM-DD in the given IANA timezone (for closure dates, etc.). */
export function dateKeyInTimezone(
  timeZone = DEFAULT_SHOP_TIMEZONE,
  now = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
