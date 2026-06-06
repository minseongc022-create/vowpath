import {
  isApprovedBooking,
  isPendingShopReview,
  normalizeRequestStatus,
} from "@/lib/booking-policy";

type ListStatusKind = "review" | "approved";

const KIND_STYLES: Record<ListStatusKind, string> = {
  review: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
};

export function bookingListStatusDisplay(
  status: string | undefined | null,
): { label: string; kind: ListStatusKind } | null {
  const s = normalizeRequestStatus(status ?? "pending_review");
  if (isPendingShopReview(s)) {
    return { label: "검토 필요", kind: "review" };
  }
  if (isApprovedBooking(s)) {
    return { label: "승인됨", kind: "approved" };
  }
  return null;
}

type BookingStatusBadgeProps = {
  status: string | undefined | null;
  className?: string;
};

export function BookingStatusBadge({ status, className = "" }: BookingStatusBadgeProps) {
  const display = bookingListStatusDisplay(status);
  if (!display) return null;

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${KIND_STYLES[display.kind]} ${className}`}
    >
      {display.label}
    </span>
  );
}
