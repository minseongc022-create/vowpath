import {
  initialRequestStatusAfterIntake,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { withResolvedBookingStatus } from "./request-status-resolve";
import { parseUsAddress } from "./parse-contact";
import { mergeJobsWithJobber } from "./operations-analytics";
import { priorityFromJobberTitle } from "./jobber-bookings";
import type { JobberBookingRecord } from "./jobber-bookings";
import type { CallRecord } from "./operations-analytics";
import { resolvePriorityFields } from "./service-priority";
import {
  localizeIssueType as koIssueType,
  localizeCustomerName,
  localizeCityState as koCityState,
  localizeAddress as koAddress,
  localizeArrivalWindow as koArrival,
} from "./ko-display";
import {
  priorityDisplayLabel,
  type PriorityDisplayLabel,
} from "./priority-display";
import { isEnglishUi } from "./locale";
import type { JobCard, JobPriority } from "./types";
import type { ServicePriority } from "./service-priority";

export type BookingPriorityBadge = PriorityDisplayLabel;

export type RecentBooking = {
  id: string;
  customerName: string;
  issueType: string;
  cityState: string;
  priority: JobPriority;
  servicePriority: ServicePriority;
  priorityReasons: string[];
  prioritySource?: "ai" | "manual";
  priorityBadge: BookingPriorityBadge;
  createdAt: string;
  address: string;
  status: string;
  arrivalWindow?: string;
  jobberJobId?: string;
  source: "job" | "jobber" | "call";
  /** Free-estimate lead vs service/emergency. */
  requestKind?: "estimate" | "service";
};

export function priorityToBadge(priority: JobPriority): BookingPriorityBadge {
  return priorityDisplayLabel(priority);
}

function priorityFieldsFromJob(job: JobCard) {
  return resolvePriorityFields(job);
}

function priorityFieldsFromCall(call: CallRecord) {
  return resolvePriorityFields({
    priority: call.priority,
    servicePriority: call.servicePriority,
    priorityReasons: call.priorityReasons,
    prioritySource: call.prioritySource,
    priorityOverriddenAt: call.priorityOverriddenAt,
  });
}

export function formatCityState(address: string): string {
  const parsed = parseUsAddress(address);
  const city = parsed.city.trim();
  const state = parsed.province.trim();
  let result = "—";
  if (city && city !== "Unknown" && state) result = `${city}, ${state}`;
  else if (state && state !== "TX") result = state;
  else if (city && city !== "Unknown") result = city;
  return koCityState(result);
}

/** Pull human-readable issue from symptom or Jobber pipe-title. */
export function extractIssueType(
  symptom: string,
  fallback = isEnglishUi() ? "Service request" : "서비스 요청",
): string {
  const raw = symptom.trim();
  if (!raw) return fallback;

  if (raw.includes("|")) {
    const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
    const issuePart = parts.find(
      (p) =>
        !/^긴급\(P1\)/i.test(p) &&
        !/^당일\(P2\)/i.test(p) &&
        !/^일반\(P3\)/i.test(p) &&
        !/\bP[123]\b/.test(p) &&
        p.length > 2,
    );
    if (issuePart) return capitalizeIssue(issuePart);
  }

  const cleaned = raw
    .replace(/^긴급\(P1\)\s*\|?\s*/i, "")
    .replace(/^당일\(P2\)\s*\|?\s*/i, "")
    .replace(/^일반\(P3\)\s*\|?\s*/i, "")
    .trim();

  return koIssueType(capitalizeIssue(cleaned || fallback));
}

function capitalizeIssue(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Canonical booking list id — phone intake uses call-{callLogId}. */
export function bookingIdForJob(job: Pick<JobCard, "id" | "sourceCallId">): string {
  if (job.sourceCallId) return `call-${job.sourceCallId}`;
  return job.id;
}

export function bookingFromJob(
  job: JobCard,
  requestStatuses: Record<string, RequestStatus> = {},
): RecentBooking {
  return withResolvedBookingStatus(jobToRecentBooking(job), requestStatuses);
}

function intakeCreatedAt(job: JobCard, calls: CallRecord[]): string {
  if (job.sourceCallId) {
    const call = calls.find((c) => c.id === job.sourceCallId);
    if (call?.createdAt) return call.createdAt;
  }
  return job.createdAt;
}

function jobToRecentBooking(job: JobCard, calls: CallRecord[] = []): RecentBooking {
  const source = job.id.startsWith("jobber-") ? "jobber" : "job";
  const pf = priorityFieldsFromJob(job);
  const estimate =
    job.requestKind === "estimate" ||
    /estimate|quote/i.test(`${job.arrivalWindow ?? ""} ${job.symptom ?? ""}`);
  return {
    id: bookingIdForJob(job),
    customerName: localizeCustomerName(job.customerName || "Unknown customer"),
    issueType: estimate ? "Estimate" : extractIssueType(job.symptom),
    cityState: formatCityState(job.address),
    priority: pf.priority,
    servicePriority: pf.servicePriority,
    priorityReasons: pf.priorityReasons,
    prioritySource: pf.prioritySource,
    priorityBadge: priorityToBadge(pf.priority),
    createdAt: intakeCreatedAt(job, calls),
    address: koAddress(job.address),
    status: normalizeRequestStatus(job.status),
    arrivalWindow: job.arrivalWindow ? koArrival(job.arrivalWindow) : undefined,
    jobberJobId: job.jobberJobId,
    source,
    requestKind: estimate ? "estimate" : job.requestKind ?? "service",
  };
}

function callToRecentBooking(call: CallRecord): RecentBooking {
  const pf = priorityFieldsFromCall({
    ...call,
    priority: call.priority ?? priorityFromJobberTitle(call.symptom ?? ""),
  });
  return {
    id: `call-${call.id}`,
    customerName: localizeCustomerName(
      call.customerName || call.from || "Unknown customer",
    ),
    issueType: extractIssueType(
      call.symptom ?? "",
      isEnglishUi() ? "Inbound call" : "인바운드 콜",
    ),
    cityState: formatCityState(call.address ?? ""),
    priority: pf.priority,
    servicePriority: pf.servicePriority,
    priorityReasons: pf.priorityReasons,
    prioritySource: pf.prioritySource,
    priorityBadge: priorityToBadge(pf.priority),
    createdAt: call.createdAt,
    address: koAddress(call.address ?? ""),
    arrivalWindow: call.arrivalWindow ? koArrival(call.arrivalWindow) : undefined,
    status: call.jobberRequestId
      ? initialRequestStatusAfterIntake()
      : initialRequestStatusAfterIntake(),
    jobberJobId: call.jobberRequestId,
    source: "call",
  };
}

export function buildRecentBookingsList(
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  calls: CallRecord[],
  limit = 10,
  requestStatuses: Record<string, RequestStatus> = {},
): RecentBooking[] {
  const merged = mergeJobsWithJobber(jobs, jobberBookings);
  const seenJobberIds = new Set(
    merged.map((j) => j.jobberJobId).filter((id): id is string => Boolean(id)),
  );

  const coveredCallIds = new Set(
    merged.map((j) => j.sourceCallId).filter((id): id is string => Boolean(id)),
  );

  const fromRecords = merged
    .map((job) => jobToRecentBooking(job, calls))
    .map((b) => withResolvedBookingStatus(b, requestStatuses));

  const fromCalls = calls
    .filter((c) => !coveredCallIds.has(c.id))
    .filter((c) => !c.jobberRequestId || !seenJobberIds.has(c.jobberRequestId))
    .map(callToRecentBooking)
    .map((b) => withResolvedBookingStatus(b, requestStatuses));

  return [...fromRecords, ...fromCalls]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function findRecentBooking(
  bookings: RecentBooking[],
  id: string,
  opts?: {
    jobs?: JobCard[];
    calls?: CallRecord[];
    statuses?: Record<string, RequestStatus>;
  },
): RecentBooking | undefined {
  const decoded = decodeURIComponent(id.trim());
  const direct = bookings.find((b) => b.id === decoded);
  if (direct) return direct;

  if (decoded.startsWith("call-")) {
    const callId = decoded.slice("call-".length);
    const job = opts?.jobs?.find((j) => j.sourceCallId === callId);
    if (job) {
      const canonical = bookingIdForJob(job);
      const byCanonical = bookings.find((b) => b.id === canonical);
      if (byCanonical) return byCanonical;
      const byJobId = bookings.find((b) => b.id === job.id);
      if (byJobId) return byJobId;
      return bookingFromJob(job, opts?.statuses ?? {});
    }
    const fromCall = bookings.find((b) => b.id === decoded);
    if (fromCall) return fromCall;
  } else {
    const job = opts?.jobs?.find((j) => j.id === decoded);
    if (job) {
      const canonical = bookingIdForJob(job);
      const byCanonical = bookings.find((b) => b.id === canonical);
      if (byCanonical) return byCanonical;
      if (job.sourceCallId) {
        return bookingFromJob(job, opts?.statuses ?? {});
      }
    }
  }

  return undefined;
}

/** Street line for list headlines (comma-separated address → first segment). */
export function bookingStreetLabel(address: string): string {
  const raw = address?.trim();
  if (!raw || raw === "—") return isEnglishUi() ? "Address pending" : "주소 미확인";
  const parsed = parseUsAddress(raw);
  const street = koAddress(parsed.street1);
  if (street && street !== "—" && !/unknown|미확인/i.test(street)) {
    return street;
  }
  const city = formatCityState(raw);
  return city !== "—" ? city : koAddress(raw);
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Primary list line: address · visit window (or relative intake time if no window yet). */
export function formatBookingListHeadline(booking: RecentBooking, nowMs = Date.now()): string {
  const street = bookingStreetLabel(booking.address);
  const window = booking.arrivalWindow?.trim();
  if (window && window.length >= 3 && !/^need\b/i.test(window)) {
    return `${street} · ${window}`;
  }
  return `${street} · ${formatBookingReceivedLabel(booking.createdAt, nowMs)}`;
}

/** Secondary list line: customer · issue. */
export function formatBookingListSubtitle(booking: RecentBooking): string {
  return `${booking.customerName} · ${booking.issueType}`;
}

export function formatBookingLocalDateTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return at.toLocaleString(isEnglishUi() ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatBookingRelativeAgo(iso: string, nowMs = Date.now()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const diff = nowMs - at.getTime();
  if (isEnglishUi()) {
    if (diff < 0) return "Just now";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return sec <= 1 ? "Just now" : `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
  } else {
    if (diff < 0) return "방금";
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return sec <= 1 ? "방금" : `${sec}초 전`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}일 전`;
  }
  return formatBookingLocalDateTime(iso);
}

/** Relative for the last 7 days; absolute date/time after that. */
export function formatBookingReceivedLabel(iso: string, nowMs = Date.now()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  const diff = nowMs - at.getTime();
  if (diff >= SEVEN_DAYS_MS) {
    return formatBookingLocalDateTime(iso);
  }
  return formatBookingRelativeAgo(iso, nowMs);
}

/** @deprecated Use formatBookingReceivedLabel */
export function formatBookingTimeAgo(iso: string, nowMs = Date.now()): string {
  return formatBookingReceivedLabel(iso, nowMs);
}

export function buildAllRecentBookings(
  jobs: JobCard[],
  jobberBookings: JobberBookingRecord[],
  calls: CallRecord[],
  requestStatuses: Record<string, RequestStatus> = {},
): RecentBooking[] {
  return buildRecentBookingsList(
    jobs,
    jobberBookings,
    calls,
    Number.MAX_SAFE_INTEGER,
    requestStatuses,
  );
}
