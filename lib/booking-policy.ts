import { isEnglishUi } from "./locale";

/**
 * Booking policy: customer picks a visit window; shop may approve before Jobber write (mode-dependent).
 */

/** @deprecated Use SchedulingMode from booking-settings.ts */
export type BookingMode = "request_only" | "auto_booking";

export const DEFAULT_BOOKING_MODE: BookingMode = "request_only";

export type SchedulingMode = "auto" | "speed" | "hybrid" | "control";

export type RequestStatus =
  | "request_received"
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "completed";

export const REQUEST_STATUSES: RequestStatus[] = [
  "request_received",
  "pending_review",
  "approved",
  "rejected",
  "scheduled",
  "completed",
];

const REQUEST_STATUS_LABELS_EN: Record<RequestStatus, string> = {
  request_received: "Request received",
  pending_review: "Reviewing your request",
  approved: "Approved — we'll see you soon!",
  rejected: "Unable to schedule",
  scheduled: "On the schedule",
  completed: "Visit complete",
};

const REQUEST_STATUS_LABELS_KO: Record<RequestStatus, string> = {
  request_received: "요청 접수",
  pending_review: "검토 대기",
  approved: "승인됨",
  rejected: "거절됨",
  scheduled: "일정 확정",
  completed: "완료",
};

/** Customer-facing status labels (portal / SMS). Resolved at access time for locale toggle. */
export function getRequestStatusLabels(): Record<RequestStatus, string> {
  return isEnglishUi() ? REQUEST_STATUS_LABELS_EN : REQUEST_STATUS_LABELS_KO;
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = new Proxy(
  {} as Record<RequestStatus, string>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      return getRequestStatusLabels()[prop as RequestStatus];
    },
    ownKeys() {
      return Reflect.ownKeys(getRequestStatusLabels());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const labels = getRequestStatusLabels();
      if (typeof prop === "string" && prop in labels) {
        return { configurable: true, enumerable: true, value: labels[prop as RequestStatus] };
      }
      return undefined;
    },
  },
);

/** Shop dashboard / owner SMS — action-oriented, not customer cheer. */
const OWNER_REQUEST_STATUS_LABELS_EN: Record<RequestStatus, string> = {
  request_received: "Request received",
  pending_review: "Needs your review",
  approved: "Approved",
  rejected: "Declined",
  scheduled: "Scheduled",
  completed: "Completed",
};

const OWNER_REQUEST_STATUS_LABELS_KO: Record<RequestStatus, string> = {
  request_received: "요청 접수",
  pending_review: "업체 검토 필요",
  approved: "승인됨",
  rejected: "거절됨",
  scheduled: "일정 확정",
  completed: "완료",
};

export function getOwnerRequestStatusLabels(): Record<RequestStatus, string> {
  return isEnglishUi() ? OWNER_REQUEST_STATUS_LABELS_EN : OWNER_REQUEST_STATUS_LABELS_KO;
}

export const OWNER_REQUEST_STATUS_LABELS: Record<RequestStatus, string> = new Proxy(
  {} as Record<RequestStatus, string>,
  {
    get(_target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      return getOwnerRequestStatusLabels()[prop as RequestStatus];
    },
    ownKeys() {
      return Reflect.ownKeys(getOwnerRequestStatusLabels());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const labels = getOwnerRequestStatusLabels();
      if (typeof prop === "string" && prop in labels) {
        return { configurable: true, enumerable: true, value: labels[prop as RequestStatus] };
      }
      return undefined;
    },
  },
);

/** Twilio closing message — never imply appointment is confirmed. */
export const CUSTOMER_REQUEST_RECEIVED_MESSAGE =
  "You're all set — we've got your request, and we really appreciate you calling! Our team will follow up with your arrival window very soon. Thank you so much — we're looking forward to helping you!";

export const CUSTOMER_REQUEST_RECEIVED_MESSAGE_SHORT =
  "Got it — your request is in! We'll be in touch shortly. Thank you so much for reaching out!";

/** Played instead of CUSTOMER_REQUEST_RECEIVED_MESSAGE when the failure was specifically
 * an AI/OpenAI outage (extraction never ran), so the caller isn't told their request
 * details were captured when they weren't. */
export const AI_BRIEF_ISSUE_MESSAGE =
  "I'm sorry, we're experiencing a brief issue. Please hold while I connect you, or we'll call you right back shortly.";

export const CUSTOMER_SLOT_CONFIRMED_MESSAGE =
  "Wonderful — you're all set! We noted your visit window and we'll text you a confirmation very soon. Thank you so much for choosing us — we can't wait to help you out!";

export function isAutoBookingMode(mode: BookingMode = DEFAULT_BOOKING_MODE): boolean {
  return mode === "auto_booking";
}

export function normalizeRequestStatus(raw: string | undefined | null): RequestStatus {
  switch (raw) {
    case "request_received":
      return "request_received";
    case "pending_review":
      return "pending_review";
    case "approved":
    case "Approved":
      return "approved";
    case "rejected":
    case "Rejected":
      return "rejected";
    case "scheduled":
    case "completed":
      return raw;
    case "confirmed":
    case "sms_sent":
      return "approved";
    case "pending_approval":
    case "pending":
    case "Pending":
      return "pending_review";
    default:
      return "pending_review";
  }
}

/** Counts toward request volume (not rejected). */
export function isActiveServiceRequest(status: string): boolean {
  const s = normalizeRequestStatus(status);
  return s !== "rejected";
}

/** Shop has approved — safe to treat as a confirmed booking for KPIs. */
export function isApprovedBooking(status: string): boolean {
  const s = normalizeRequestStatus(status);
  return s === "approved" || s === "scheduled" || s === "completed";
}

export function isPendingShopReview(status: string): boolean {
  const s = normalizeRequestStatus(status);
  return s === "request_received" || s === "pending_review";
}

/** AI가 업체에 승인 요청을 보냈고, 업체가 아직 승인/거절하지 않은 고객 */
export function isWaitingCustomer(status: string): boolean {
  return normalizeRequestStatus(status) === "pending_review";
}

/** @deprecated Use countWaitingCustomers from booking-status-counts.ts */
export function countWaitingCustomers(
  requestStatuses: Record<string, RequestStatus | string>,
): number {
  return Object.values(requestStatuses).filter((s) => isWaitingCustomer(String(s))).length;
}

export function canApprove(status: string): boolean {
  return isPendingShopReview(status);
}

export function canReject(status: string): boolean {
  return isPendingShopReview(status);
}

/** Cancel an auto-booked (scheduled) job — moves it to rejected. */
export function canCancelScheduled(status: string): boolean {
  return normalizeRequestStatus(status) === "scheduled";
}

export function canMarkScheduled(status: string): boolean {
  // Only promote approved → scheduled. Already-scheduled stays on "Mark completed".
  return normalizeRequestStatus(status) === "approved";
}

export function canMarkCompleted(status: string): boolean {
  const s = normalizeRequestStatus(status);
  return s === "approved" || s === "scheduled";
}

export function initialRequestStatusAfterIntake(): RequestStatus {
  return "pending_review";
}
