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
