import {
  isApprovedBooking,
  isWaitingCustomer,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { filterByDateRange } from "./dashboard-analytics";
import type { JobberBookingRecord } from "./jobber-bookings";
import {
  isAiHandledCall,
  isLikelyMissedWithoutAi,
  parseShopScheduleRows,
} from "./missed-calls-prevented";
import {
  buildAllRecentBookings,
} from "./recent-bookings";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import {
  isAfterHours,
  isEmergencyPriority,
  resolveDateRange,
  type CallRecord,
  type DatePreset,
} from "./operations-analytics";
import type { JobCard, ShopState } from "./types";
import { isEnglishUi } from "./locale";

export type MissedCallsAnalyticsPreset = Extract<
  DatePreset,
  "today" | "7d" | "30d" | "6m" | "1y"
>;

export type MissedCallsDailyPoint = {
  date: string;
  label: string;
  periodLabel: string;
  /** AI가 살린 고객 (부재 중 콜) */
  callsSaved: number;
  /** 업체 승인 응답 대기 고객 (요청 생성일 기준) */
  waitingCustomers: number;
  /** P1 긴급 콜 */
  emergency: number;
  /** 승인·일정 확정·완료 예약 (요청 생성일 기준) */
  bookedJobs: number;
  /** 인바운드 전화 콜 */
  inboundCalls: number;
};

export type MissedCallsAnalyticsContext = {
  jobs?: JobCard[];
  jobberBookings?: JobberBookingRecord[];
  requestStatuses?: Record<string, RequestStatus>;
};

export const EMPTY_TREND_METRICS = {
  callsSaved: 0,
  waitingCustomers: 0,
  emergency: 0,
  bookedJobs: 0,
  inboundCalls: 0,
} as const;

export type MissedCallsAnalytics = {
  totalCalls: number;
  aiAnsweredCalls: number;
  missedCallsPrevented: number;
  afterHoursCalls: number;
  weekendCalls: number;
  /** Calls that likely would have been missed without Vowpath (same as prevented in range). */
  estimatedMissedWithoutEffiroad: number;
  dailyPrevented: MissedCallsDailyPoint[];
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isWeekendCall(iso: string): boolean {
  const day = new Date(iso).getDay();
  return day === 0 || day === 6;
}

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfDay(start);
  const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatDayLabel(d: Date, includeYear: boolean): string {
  const locale = isEnglishUi() ? "en-US" : "ko-KR";
  return d.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

type CallFlags = {
  aiHandled: boolean;
  missedPrevented: boolean;
  afterHours: boolean;
  weekend: boolean;
};

function classifyCall(
  call: CallRecord,
  scheduleRows: ReturnType<typeof parseShopScheduleRows>,
  scheduleActive: boolean,
): CallFlags {
  const aiHandled = isAiHandledCall(call);
  const missedPrevented =
    aiHandled &&
    isLikelyMissedWithoutAi(call.createdAt, scheduleRows, scheduleActive);
  return {
    aiHandled,
    missedPrevented,
    afterHours: aiHandled && isAfterHours(call.createdAt),
    weekend: aiHandled && isWeekendCall(call.createdAt),
  };
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function buildMissedCallsAnalytics(
  calls: CallRecord[],
  shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">,
  start: Date,
  end: Date,
  ctx?: MissedCallsAnalyticsContext,
): MissedCallsAnalytics {
  const inRange = filterByDateRange(calls, start, end);
  const scheduleWindows = Array.isArray(shop.scheduleWindows) ? shop.scheduleWindows : [];
  const scheduleRows =
    shop.answerScheduleActive && scheduleWindows.length > 0
      ? parseShopScheduleRows(scheduleWindows)
      : [];

  let aiAnsweredCalls = 0;
  let missedCallsPrevented = 0;
  let afterHoursCalls = 0;
  let weekendCalls = 0;

  const callsSavedByDay = new Map<string, number>();
  const inboundByDay = new Map<string, number>();
  const emergencyByDay = new Map<string, number>();
  const bookedByDay = new Map<string, number>();
  const waitingByDay = new Map<string, number>();

  for (const call of inRange) {
    const dayKey = startOfDay(new Date(call.createdAt)).toISOString().slice(0, 10);
    inboundByDay.set(dayKey, (inboundByDay.get(dayKey) ?? 0) + 1);
    const flags = classifyCall(call, scheduleRows, shop.answerScheduleActive);
    if (flags.aiHandled) {
      aiAnsweredCalls += 1;
    }
    if (flags.missedPrevented) {
      missedCallsPrevented += 1;
      callsSavedByDay.set(dayKey, (callsSavedByDay.get(dayKey) ?? 0) + 1);
    }
    if (isEmergencyPriority(call.priority)) {
      emergencyByDay.set(dayKey, (emergencyByDay.get(dayKey) ?? 0) + 1);
    }
    if (flags.afterHours) afterHoursCalls += 1;
    if (flags.weekend) weekendCalls += 1;
  }

  if (ctx?.jobs && ctx.jobberBookings) {
    const statuses = ctx.requestStatuses ?? {};
    const bookings = buildAllRecentBookings(
      ctx.jobs,
      ctx.jobberBookings,
      calls,
      statuses,
    );
    const rangeStart = startOfDay(start).getTime();
    const rangeEnd = endOfDay(end).getTime();

    for (const booking of bookings) {
      const created = new Date(booking.createdAt).getTime();
      if (created < rangeStart || created > rangeEnd) continue;
      const dayKey = startOfDay(new Date(booking.createdAt)).toISOString().slice(0, 10);
      const status =
        lookupStoredRequestStatus(booking.id, statuses, booking.jobberJobId) ??
        normalizeRequestStatus(booking.status);
      if (isApprovedBooking(status)) {
        bookedByDay.set(dayKey, (bookedByDay.get(dayKey) ?? 0) + 1);
      }
      if (isWaitingCustomer(status)) {
        waitingByDay.set(dayKey, (waitingByDay.get(dayKey) ?? 0) + 1);
      }
    }
  }

  const spanDays =
    Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
  const includeYear = spanDays > 60;

  const dailyPrevented: MissedCallsDailyPoint[] = eachDayInRange(start, end).map((day) => {
    const key = day.toISOString().slice(0, 10);
    const callsSaved = callsSavedByDay.get(key) ?? 0;
    const label = formatDayLabel(day, false);
    const periodLabel = formatDayLabel(day, includeYear);
    return {
      date: key,
      label,
      periodLabel,
      callsSaved,
      waitingCustomers: waitingByDay.get(key) ?? 0,
      emergency: emergencyByDay.get(key) ?? 0,
      bookedJobs: bookedByDay.get(key) ?? 0,
      inboundCalls: inboundByDay.get(key) ?? 0,
    };
  });

  return {
    totalCalls: inRange.length,
    aiAnsweredCalls,
    missedCallsPrevented,
    afterHoursCalls,
    weekendCalls,
    estimatedMissedWithoutEffiroad: missedCallsPrevented,
    dailyPrevented,
  };
}

export function resolveMissedCallsAnalyticsRange(
  preset: MissedCallsAnalyticsPreset,
): { start: Date; end: Date } {
  const range = resolveDateRange(preset);
  if (!range) {
    const fallback = resolveDateRange("30d")!;
    return fallback;
  }
  return range;
}

