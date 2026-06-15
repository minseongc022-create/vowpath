import type { CallRecord } from "./operations-analytics";
import type { RecentBooking } from "./recent-bookings";

export const URGENT_REQUEST_KEYWORDS = [
  "no cooling",
  "no heat",
  "gas smell",
  "water leak",
  "emergency",
  "high priority",
] as const;

function textIncludesUrgentKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_REQUEST_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function isUrgentCall(call: CallRecord): boolean {
  if (call.priority === "P1") return true;
  const haystack = [
    call.symptom,
    call.issueType,
    call.transcript,
    call.aiSummary,
    call.priorityReasons?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  return textIncludesUrgentKeyword(haystack);
}

export function isUrgentBooking(booking: RecentBooking): boolean {
  if (booking.priority === "P1") return true;
  const haystack = [
    booking.issueType,
    booking.priorityReasons.join(" "),
    booking.status,
  ].join(" ");
  return textIncludesUrgentKeyword(haystack);
}

export function isNoCoolingText(text: string | undefined | null): boolean {
  return Boolean(text?.toLowerCase().includes("no cooling"));
}
