import { parseUsAddress } from "./parse-contact";
import {
  canApprove,
  canMarkCompleted,
  canMarkScheduled,
  canReject,
  isPendingShopReview,
  normalizeRequestStatus,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
} from "./booking-policy";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import { extractZipCode } from "./operations-analytics";
import type { CallRecord } from "./operations-analytics";
import type { JobberBookingRecord } from "./jobber-bookings";
import {
  extractIssueType,
  formatCityState,
  type RecentBooking,
} from "./recent-bookings";
import {
  buildRequestVerificationStatus,
  type RequestVerificationStatus,
} from "./request-verification-status";
import { buildRequestTrustScore, type RequestTrustScore } from "./request-trust-score";
import {
  localizeBookingFields,
  localizeIssueType,
  localizeArrivalWindow,
} from "./ko-display";

export type BookingDetail = RecentBooking & {
  phone: string;
  zipCode: string;
  requestStatus: RequestStatus;
  requestStatusLabel: string;
  bookingDateTime: string;
  callSummary: string;
  transcript: string | null;
  recordingUrl: string | null;
  jobberWebUri: string | null;
  linkedCallId: string | null;
  needsShopReview: boolean;
  verification: RequestVerificationStatus;
  trustScore: RequestTrustScore;
};

function findJobberRecord(
  booking: RecentBooking,
  jobberBookings: JobberBookingRecord[],
): JobberBookingRecord | undefined {
  if (!booking.jobberJobId) return undefined;
  return jobberBookings.find((b) => b.requestId === booking.jobberJobId);
}

export function findLinkedCall(
  booking: RecentBooking,
  calls: CallRecord[],
): CallRecord | undefined {
  if (booking.id.startsWith("call-")) {
    const callId = booking.id.slice("call-".length);
    return calls.find((c) => c.id === callId);
  }
  if (booking.jobberJobId) {
    const byJobber = calls.find((c) => c.jobberRequestId === booking.jobberJobId);
    if (byJobber) return byJobber;
  }
  return calls.find(
    (c) =>
      c.customerName &&
      booking.customerName &&
      c.customerName === booking.customerName &&
      Math.abs(new Date(c.createdAt).getTime() - new Date(booking.createdAt).getTime()) <
        86_400_000,
  );
}

function resolvePhone(
  booking: RecentBooking,
  call?: CallRecord,
  jobber?: JobberBookingRecord,
): string {
  if (call?.callbackPhone?.trim()) return formatPhoneDisplay(call.callbackPhone);
  if (jobber?.phone?.trim()) return formatPhoneDisplay(jobber.phone);
  if (call?.from?.trim()) return formatPhoneDisplay(call.from);
  return "—";
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw.trim();
}

function resolveZip(address: string): string {
  return extractZipCode(address) ?? parseUsAddress(address).postalCode ?? "—";
}

const REQUEST_STATUS_RANK: Record<RequestStatus, number> = {
  request_received: 0,
  pending_review: 1,
  rejected: 2,
  approved: 3,
  scheduled: 4,
  completed: 5,
};

/** When KV, server lookup, and cached job rows disagree, prefer the most progressed status. */
export function pickAuthoritativeRequestStatus(
  candidates: (RequestStatus | string | undefined | null)[],
): RequestStatus {
  const valid = candidates
    .map((s) => (s ? normalizeRequestStatus(s) : null))
    .filter((s): s is RequestStatus => s !== null);
  if (valid.length === 0) return "pending_review";
  if (valid.includes("rejected")) return "rejected";
  return valid.sort((a, b) => REQUEST_STATUS_RANK[b] - REQUEST_STATUS_RANK[a])[0];
}

export function resolveRequestStatus(
  booking: RecentBooking,
  jobber?: JobberBookingRecord,
  statuses: Record<string, RequestStatus> = {},
): RequestStatus {
  const stored = lookupStoredRequestStatus(
    booking.id,
    statuses,
    booking.jobberJobId,
  );
  if (stored) return stored;

  const fromJob = normalizeRequestStatus(booking.status);
  if (fromJob !== "pending_review") {
    return fromJob;
  }

  // Keep shop-review pending until Approve/Reject in dashboard (KV is source of truth).
  if (!jobber) return fromJob;

  const s = jobber.requestStatus.toLowerCase();
  if (s === "completed") return "completed";
  return "pending_review";
}

export function generateCallSummary(
  booking: RecentBooking,
  call?: CallRecord,
): string {
  if (call?.aiSummary?.trim()) {
    return call.aiSummary.trim();
  }

  const lines: string[] = [];
  const issueKo = localizeIssueType(booking.issueType);
  const issueKey = issueKo.toLowerCase();

  if (
    issueKo &&
    issueKo !== "—" &&
    issueKey !== "서비스 요청" &&
    issueKey !== "인바운드 콜"
  ) {
    lines.push(`고객 증상: ${issueKo}`);
  } else if (call?.symptom) {
    lines.push(`고객 증상: ${extractIssueType(call.symptom)}`);
  }

  if (booking.priority === "P1") {
    lines.push("긴급(P1) — 출동 전 샵 검토·승인이 필요합니다.");
  } else if (booking.priority === "P2") {
    lines.push("당일 희망 가능 — 승인 전까지 예약 확정이 아닙니다.");
  }

  if (booking.cityState && booking.cityState !== "—") {
    lines.push(`위치: ${booking.cityState}`);
  }

  if (call?.arrivalWindow && !lines.some((l) => l.includes("당일"))) {
    lines.push(
      `고객 희망: ${localizeArrivalWindow(call.arrivalWindow)} (검토 대기)`,
    );
  }

  if (lines.length === 0 && call?.transcript?.trim()) {
    const snippet = call.transcript.trim().slice(0, 160);
    lines.push(snippet + (call.transcript.length > 160 ? "…" : ""));
  }

  return lines.length > 0
    ? lines.join("\n")
    : "서비스 요청이 접수되었습니다. 고객 정보를 확인한 뒤 승인 또는 거절해 주세요.";
}

export function formatBookingDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildBookingDetail(
  booking: RecentBooking,
  calls: CallRecord[],
  jobberBookings: JobberBookingRecord[],
  requestStatuses: Record<string, RequestStatus> = {},
): BookingDetail {
  const call = findLinkedCall(booking, calls);
  const jobber = findJobberRecord(booking, jobberBookings);
  const requestStatus = resolveRequestStatus(booking, jobber, requestStatuses);

  const localized = localizeBookingFields({
    customerName: booking.customerName,
    issueType: booking.issueType,
    address: booking.address,
    cityState: booking.cityState,
    arrivalWindow: booking.arrivalWindow,
    callSummary: generateCallSummary(booking, call),
    priorityReasons: booking.priorityReasons ?? [],
  });

  return {
    ...booking,
    ...localized,
    status: requestStatus,
    phone: resolvePhone(booking, call, jobber),
    zipCode: resolveZip(booking.address),
    requestStatus,
    requestStatusLabel: REQUEST_STATUS_LABELS[requestStatus],
    bookingDateTime: formatBookingDateTime(booking.createdAt),
    transcript: call?.transcript?.trim() || null,
    recordingUrl: call?.recordingUrl ?? null,
    jobberWebUri: jobber?.jobberWebUri ?? null,
    linkedCallId: call?.id ?? null,
    needsShopReview: isPendingShopReview(requestStatus),
    verification: buildRequestVerificationStatus(call),
    trustScore: buildRequestTrustScore(call),
  };
}

export function phoneTelHref(phone: string): string | null {
  if (phone === "—") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+${digits.length === 10 ? "1" + digits : digits}`;
}

export { canApprove, canReject, canMarkScheduled, canMarkCompleted };
