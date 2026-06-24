import { listCallLogs } from "./call-logs";
import { formatEventTime, type CalendarEvent } from "./calendar-events";
import { normalizeJobPriority } from "./priority-display";
import { listJobs } from "./jobs-db";
import { localizeCustomerName, localizeIssueType } from "./ko-display";
import { isEnglishUi } from "./locale";
import type { CallRecord } from "./operations-analytics";
import type { ScheduledBookingRecord } from "./schedule-bookings-db";
import type { JobberScheduleItem } from "./scheduling/jobber-schedule-api";
import type { JobCard } from "./types";

function resolveCallForBooking(
  bookingId: string,
  calls: CallRecord[],
): CallRecord | undefined {
  if (bookingId.startsWith("call-")) {
    const callId = bookingId.slice("call-".length);
    return calls.find((c) => c.id === callId);
  }
  return calls.find((c) => bookingId === `call-${c.id}`);
}

function resolveJobForBooking(
  bookingId: string,
  call: CallRecord | undefined,
  jobs: JobCard[],
): JobCard | undefined {
  const byId = jobs.find((j) => j.id === bookingId);
  if (byId) return byId;
  if (call) return jobs.find((j) => j.sourceCallId === call.id);
  return undefined;
}

function vowroadEvent(
  row: ScheduledBookingRecord,
  calls: CallRecord[],
  jobs: JobCard[],
): CalendarEvent {
  const call = resolveCallForBooking(row.bookingId, calls);
  const job = resolveJobForBooking(row.bookingId, call, jobs);
  const customerName = localizeCustomerName(
    job?.customerName ||
      call?.customerName ||
      (isEnglishUi() ? "Customer" : "고객"),
  );
  const issue = localizeIssueType(
    job?.symptom ||
      call?.issueType ||
      call?.symptom ||
      (isEnglishUi() ? "Service request" : "서비스 요청"),
  );
  const address = job?.address || call?.address || call?.serviceLocation || "";
  const phone = call?.callbackPhone || call?.from;

  return {
    id: `vowroad:${row.bookingId}`,
    source: "vowroad",
    bookingId: row.bookingId,
    startAt: row.scheduledStartAt,
    endAt: row.scheduledEndAt,
    timeLabel: formatEventTime(row.scheduledStartAt, row.scheduledEndAt),
    title: customerName,
    customerName,
    phone,
    address,
    issue,
    priority: normalizeJobPriority(call?.priority || job?.priority),
    arrivalWindow: row.arrivalWindowLabel || job?.arrivalWindow,
  };
}

function jobberEvent(row: JobberScheduleItem): CalendarEvent {
  const customerName = row.clientName?.trim() || row.title;
  return {
    id: `jobber:${row.id}`,
    source: "jobber",
    startAt: row.startAt,
    endAt: row.endAt,
    timeLabel: formatEventTime(row.startAt, row.endAt),
    title: customerName,
    customerName,
    issue: row.title,
    arrivalWindow: formatEventTime(row.startAt, row.endAt),
  };
}

export async function buildCalendarEvents(
  userId: string,
  native: ScheduledBookingRecord[],
  jobber: JobberScheduleItem[],
): Promise<CalendarEvent[]> {
  const [calls, jobs] = await Promise.all([
    listCallLogs(userId),
    listJobs(userId),
  ]);

  const vowroadEvents = native.map((row) => vowroadEvent(row, calls, jobs));
  const jobberEvents = jobber.map(jobberEvent);

  return [...vowroadEvents, ...jobberEvents].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
}
