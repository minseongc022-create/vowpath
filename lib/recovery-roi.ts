import {
  isApprovedBooking,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { filterByDateRange } from "./dashboard-analytics";
import type { InboundEvent } from "./inbound-events";
import { isAiHandledCall } from "./missed-calls-prevented";
import { isAfterHours, type CallRecord } from "./operations-analytics";
import { lookupStoredRequestStatus } from "./request-status-resolve";

export type RecoveryMetrics = {
  periodLabel: string;
  inboundTotal: number;
  inboundAnsweredByAi: number;
  inboundMissedRaw: number;
  /** AI calls that reached scheduled / confirmed / completed in Vowpath. */
  bookingsFromAiCalls: number;
  /** Subset booked from after-hours AI calls (objective time window). */
  afterHoursBookingsFromAi: number;
  bookingRatePct: number;
  shadowModeActive: boolean;
  shadowModeRemaining: number;
  inShadowBaseline: boolean;
};

function isBookedStatus(status: RequestStatus | undefined): boolean {
  if (!status) return false;
  const n = normalizeRequestStatus(status);
  return isApprovedBooking(n) || n === "scheduled" || n === "completed";
}

function countRawMissedInbound(events: InboundEvent[], callSidsWithAi: Set<string>): number {
  const bySid = new Map<string, InboundEvent>();
  for (const e of events) {
    const prev = bySid.get(e.callSid);
    if (!prev || new Date(e.createdAt) > new Date(prev.createdAt)) {
      bySid.set(e.callSid, e);
    }
  }
  let missed = 0;
  for (const e of bySid.values()) {
    if (callSidsWithAi.has(e.callSid)) continue;
    const st = e.status.toLowerCase();
    if (st === "completed" && (e.durationSec ?? 0) < 8) missed += 1;
    if (st === "no-answer" || st === "busy" || st === "failed" || st === "canceled") missed += 1;
  }
  return missed;
}

function bookingStatusForCall(
  call: CallRecord,
  requestStatuses: Record<string, RequestStatus>,
): RequestStatus | undefined {
  const bookingId = `call-${call.id}`;
  return (
    lookupStoredRequestStatus(bookingId, requestStatuses, call.jobberRequestId) ?? undefined
  );
}

export function buildRecoveryMetrics(params: {
  calls: CallRecord[];
  requestStatuses: Record<string, RequestStatus>;
  inboundEvents: InboundEvent[];
  shadowModeRemaining: number;
  start: Date;
  end: Date;
}): RecoveryMetrics {
  const { calls, requestStatuses, inboundEvents, shadowModeRemaining, start, end } = params;

  const inRangeCalls = filterByDateRange(calls, start, end);
  const inRangeEvents = inboundEvents.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const aiHandled = inRangeCalls.filter(isAiHandledCall);
  const aiCallSids = new Set(
    aiHandled.map((c) => c.callSid).filter((s): s is string => Boolean(s?.trim())),
  );

  let bookingsFromAiCalls = 0;
  let afterHoursBookingsFromAi = 0;
  for (const call of aiHandled) {
    const status = bookingStatusForCall(call, requestStatuses);
    if (!isBookedStatus(status)) continue;
    bookingsFromAiCalls += 1;
    if (isAfterHours(call.createdAt)) afterHoursBookingsFromAi += 1;
  }

  const inboundTotal = Math.max(
    inRangeEvents.filter((e) => e.status === "voice_started" || e.status === "initiated")
      .length,
    aiHandled.length,
    inRangeCalls.length,
  );

  const inboundMissedRaw = countRawMissedInbound(inRangeEvents, aiCallSids);
  const bookingRatePct =
    aiHandled.length > 0
      ? Math.round((bookingsFromAiCalls / aiHandled.length) * 100)
      : 0;

  return {
    periodLabel: `${start.toLocaleDateString("en-US")} – ${end.toLocaleDateString("en-US")}`,
    inboundTotal,
    inboundAnsweredByAi: aiHandled.length,
    inboundMissedRaw,
    bookingsFromAiCalls,
    afterHoursBookingsFromAi,
    bookingRatePct,
    shadowModeActive: shadowModeRemaining > 0,
    shadowModeRemaining,
    inShadowBaseline: shadowModeRemaining > 0,
  };
}
