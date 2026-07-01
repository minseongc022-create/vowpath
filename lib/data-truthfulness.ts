import type { ShopBookingSettings } from "./booking-settings";

/** True only if Jobber is connected (gate for showing collected revenue). */
export function canShowRevenue(jobberConnected: boolean): boolean {
  return jobberConnected === true;
}

/** True when practice mode is active — bookings don't go live. */
export function isPracticeMode(settings: Pick<ShopBookingSettings, "shadowModeRemaining">): boolean {
  return settings.shadowModeRemaining > 0;
}

/**
 * Safe display for an AI-extracted intake field.
 * "Unknown", empty, or missing → fallback (default "—").
 */
export function fieldDisplayValue(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value || value.trim() === "" || value.trim().toLowerCase() === "unknown") {
    return fallback;
  }
  return value.trim();
}

/**
 * Safe revenue display from Jobber invoice cents.
 * Returns null when Jobber is not connected — caller must show empty state.
 * Never shows $0 as a meaningful number for unconnected shops.
 */
export function safeRevenueDisplay(
  cents: number | null | undefined,
  jobberConnected: boolean,
): string | null {
  if (!jobberConnected) return null;
  if (cents == null || cents < 0) return null;
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Label suffix to add when showing estimated (not actual) values in any UI. */
export const ESTIMATE_LABEL = "Estimate";

/** Tooltip copy for estimated values — shown next to avgJobTicket-based calculations. */
export const ESTIMATE_TOOLTIP =
  "Estimated from your average job ticket setting — not actual collected revenue. Connect Jobber to see real numbers.";

/** Empty-state message when Jobber is not connected. */
export const REVENUE_EMPTY_STATE =
  "Connect Jobber to see collected revenue";

/** Empty-state message when no data exists for the selected period. */
export const NO_DATA_EMPTY_STATE = "No data yet";
