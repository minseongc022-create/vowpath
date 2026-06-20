import {
  isApprovedBooking,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { filterByDateRange } from "./dashboard-analytics";
import type { InboundEvent } from "./inbound-events";
import {
  isAiHandledCall,
  isLikelyMissedWithoutAi,
  parseShopScheduleRows,
} from "./missed-calls-prevented";
import type { CallRecord } from "./operations-analytics";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import type { ShopState } from "./types";

export type RecoveryMetrics = {
  periodLabel: string;
  avgJobTicketUsd: number;
  inboundTotal: number;
  inboundAnsweredByAi: number;
  inboundMissedRaw: number;
  callsRecovered: number;
  callsRecoveredRatePct: number;
  estimatedRecoveredUsd: number;
  shadowModeActive: boolean;
  shadowModeRemaining: number;
  inShadowBaseline: boolean;
};

function isRecoveredStatus(status: RequestStatus | undefined): boolean {
  if (!status) return false;
  const n = normalizeRequestStatus(status);
  return (
    isApprovedBooking(n) ||
    n === "scheduled" ||
    n === "completed"
  );
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

export function buildRecoveryMetrics(params: {
  calls: CallRecord[];
  requestStatuses: Record<string, RequestStatus>;
  shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">;
  inboundEvents: InboundEvent[];
  avgJobTicketUsd: number;
  shadowModeRemaining: number;
  start: Date;
  end: Date;
}): RecoveryMetrics {
  const {
    calls,
    requestStatuses,
    shop,
    inboundEvents,
    avgJobTicketUsd,
    shadowModeRemaining,
    start,
    end,
  } = params;

  const inRangeCalls = filterByDateRange(calls, start, end);
  const inRangeEvents = inboundEvents.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= start.getTime() && t <= end.getTime();
  });

  const scheduleWindows = Array.isArray(shop.scheduleWindows) ? shop.scheduleWindows : [];
  const scheduleRows =
    shop.answerScheduleActive && scheduleWindows.length > 0
      ? parseShopScheduleRows(scheduleWindows)
      : [];

  const aiHandled = inRangeCalls.filter(isAiHandledCall);
  const aiCallSids = new Set(
    aiHandled.map((c) => c.callSid).filter((s): s is string => Boolean(s?.trim())),
  );

  let recovered = 0;
  for (const call of aiHandled) {
    if (
      !isLikelyMissedWithoutAi(
        call.createdAt,
        scheduleRows,
        shop.answerScheduleActive,
      )
    ) {
      continue;
    }
    const bookingId = `call-${call.id}`;
    const status =
      lookupStoredRequestStatus(bookingId, requestStatuses, call.jobberRequestId) ??
      undefined;
    if (isRecoveredStatus(status)) recovered += 1;
  }

  const inboundTotal = Math.max(
    inRangeEvents.filter((e) => e.status === "voice_started" || e.status === "initiated")
      .length,
    aiHandled.length,
    inRangeCalls.length,
  );

  const inboundMissedRaw = countRawMissedInbound(inRangeEvents, aiCallSids);
  const ratePct =
    aiHandled.length > 0 ? Math.round((recovered / aiHandled.length) * 100) : 0;

  return {
    periodLabel: `${start.toLocaleDateString("en-US")} – ${end.toLocaleDateString("en-US")}`,
    avgJobTicketUsd,
    inboundTotal,
    inboundAnsweredByAi: aiHandled.length,
    inboundMissedRaw,
    callsRecovered: recovered,
    callsRecoveredRatePct: ratePct,
    estimatedRecoveredUsd: recovered * avgJobTicketUsd,
    shadowModeActive: shadowModeRemaining > 0,
    shadowModeRemaining,
    inShadowBaseline: shadowModeRemaining > 0,
  };
}
