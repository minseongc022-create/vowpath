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

const DAY_MS = 86_400_000;

function localPartsInTimezone(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(instant);

  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
    second: pick("second"),
  };
}

/** UTC instant for a shop-local calendar date + clock time. */
export function utcFromShopLocal(
  dateKey: string,
  hour: number,
  minute: number,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d, hour, minute, 0);

  for (let i = 0; i < 4; i++) {
    const parts = localPartsInTimezone(timeZone, new Date(guess));
    const targetMin = hour * 60 + minute;
    const actualMin = parts.hour * 60 + parts.minute;
    let dayDelta = 0;
    if (parts.year !== y || parts.month !== m || parts.day !== d) {
      const targetKey = dateKey;
      const actualKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
      dayDelta = targetKey > actualKey ? 1 : -1;
    }
    const diffMin = dayDelta * 24 * 60 + (targetMin - actualMin);
    if (diffMin === 0) break;
    guess += diffMin * 60_000;
  }

  return new Date(guess);
}

/** Add whole days to a shop-local date key. */
export function addDaysToDateKey(
  dateKey: string,
  days: number,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const noon = utcFromShopLocal(dateKey, 12, 0, timeZone);
  return dateKeyInTimezone(timeZone, new Date(noon.getTime() + days * DAY_MS));
}

export function formatTimeLabelInTimezone(
  start: Date,
  end: Date,
  timeZone = DEFAULT_SHOP_TIMEZONE,
): string {
  const fmt = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "12";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value ?? "AM";
    const m = Number(minute);
    return m === 0 ? `${hour} ${dayPeriod}` : `${hour}:${minute} ${dayPeriod}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}
