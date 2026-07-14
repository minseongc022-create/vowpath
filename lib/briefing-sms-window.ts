import { DEFAULT_SHOP_TIMEZONE } from "./us-timezone.ts";

function hourMinuteInTimezone(timeZone = DEFAULT_SHOP_TIMEZONE, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  return {
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

/** True during the hour configured in company AI memory (cron runs hourly). */
export function isBriefingSmsSendWindow(
  scheduledTime: string,
  now = new Date(),
  timeZone = DEFAULT_SHOP_TIMEZONE,
): boolean {
  const [hourStr, minStr] = scheduledTime.split(":");
  const targetHour = Number(hourStr);
  const targetMinute = Number(minStr ?? 0);
  if (!Number.isFinite(targetHour) || targetHour < 0 || targetHour > 23) return false;

  const { hour, minute } = hourMinuteInTimezone(timeZone, now);
  return hour === targetHour && minute >= targetMinute && minute < targetMinute + 60;
}

export function calendarDateInTimezone(timeZone = DEFAULT_SHOP_TIMEZONE, date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
