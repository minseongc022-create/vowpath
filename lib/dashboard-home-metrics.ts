import {

  buildMissedCallsAnalytics,

  type MissedCallsDailyPoint,

} from "./missed-calls-analytics";

import { filterByDateRange } from "./dashboard-analytics";

import {

  buildOperationsMetrics,

  isEmergencyPriority,

  resolveMonthToDate,

  resolvePreviousMonthSamePeriod,

  type CallRecord,

} from "./operations-analytics";

import type { JobberBookingRecord } from "./jobber-bookings";

import { countPendingShopReviewBookings } from "./booking-status-counts";

import type { RequestStatus } from "./booking-policy";

import type { JobCard } from "./types";

import { normalizeShopState } from "./shop-storage";
import type { ShopState } from "./types";
import { parseRowsFromStored } from "./schedule-format";
import { resolveShopTimezone } from "./shop-timezone";
import { isEnglishUi } from "./locale";



export type KpiSparkline = number[];



export type DashboardKpi = {

  value: number;

  display: string;

  deltaPct: number;

  sparkline: KpiSparkline;

};



export type CallInsightRow = {

  key: string;

  label: string;

  sublabel: string;

  value: number;

  deltaPct: number;

  tone: "brand" | "emerald" | "rose";

};



export type DashboardHomeMetrics = {

  rangeLabel: string;

  compareLabel: string;

  missedPrevented: DashboardKpi;

  emergencyRequests: DashboardKpi;

  conversionRate: DashboardKpi;

  aiAnswered: DashboardKpi;

  insights: CallInsightRow[];

  dailyPrevented: MissedCallsDailyPoint[];

  pendingReviewCount: number;

};



function pctChange(current: number, previous: number): number {

  if (previous === 0) return current > 0 ? 100 : 0;

  return Math.round(((current - previous) / previous) * 100);

}



function sparklineFromDaily(

  points: { callsSaved?: number; bookings?: number; calls?: number }[],

  key: "callsSaved" | "bookings" | "calls",

  maxPoints = 14,

): KpiSparkline {

  const slice = points.slice(-maxPoints);

  return slice.map((p) => {

    if (key === "callsSaved") return p.callsSaved ?? 0;

    if (key === "bookings") return p.bookings ?? 0;

    return p.calls ?? 0;

  });

}



/** Daily P1 count over chart range */

function buildDailyEmergencyCounts(calls: CallRecord[], start: Date, end: Date): KpiSparkline {

  const analytics = buildMissedCallsAnalytics(

    calls,

    { scheduleWindows: [], answerScheduleActive: false },

    start,

    end,

  );

  return analytics.dailyPrevented.map((d) => {

    const dayStart = new Date(d.date);

    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(d.date);

    dayEnd.setHours(23, 59, 59, 999);

    return filterByDateRange(calls, dayStart, dayEnd).filter((c) =>

      isEmergencyPriority(c.priority),

    ).length;

  });

}



function buildCallInsights(

  monthAnalytics: { afterHoursCalls: number; weekendCalls: number },

  monthOps: { kpis: { emergencyCalls: number; emergencyDelta: number } },

  prevAnalytics: { afterHoursCalls: number; weekendCalls: number },

): CallInsightRow[] {

  if (isEnglishUi()) {

    return [

      {

        key: "afterHours",

        label: "After-hours calls",

        sublabel: "AI answered · outside business hours",

        value: monthAnalytics.afterHoursCalls,

        deltaPct: pctChange(monthAnalytics.afterHoursCalls, prevAnalytics.afterHoursCalls),

        tone: "brand",

      },

      {

        key: "weekend",

        label: "Weekend calls",

        sublabel: "Sat / Sun · AI answered",

        value: monthAnalytics.weekendCalls,

        deltaPct: pctChange(monthAnalytics.weekendCalls, prevAnalytics.weekendCalls),

        tone: "emerald",

      },

      {

        key: "emergency",

        label: "Emergency calls",

        sublabel: "P1 priority",

        value: monthOps.kpis.emergencyCalls,

        deltaPct: monthOps.kpis.emergencyDelta,

        tone: "rose",

      },

    ];

  }

  return [

    {

      key: "afterHours",

      label: "야간·주말 콜",

      sublabel: "AI 응답 · 업무 외 시간",

      value: monthAnalytics.afterHoursCalls,

      deltaPct: pctChange(monthAnalytics.afterHoursCalls, prevAnalytics.afterHoursCalls),

      tone: "brand",

    },

    {

      key: "weekend",

      label: "주말 콜",

      sublabel: "토·일 AI 응답",

      value: monthAnalytics.weekendCalls,

      deltaPct: pctChange(monthAnalytics.weekendCalls, prevAnalytics.weekendCalls),

      tone: "emerald",

    },

    {

      key: "emergency",

      label: "긴급 콜",

      sublabel: "P1 우선순위",

      value: monthOps.kpis.emergencyCalls,

      deltaPct: monthOps.kpis.emergencyDelta,

      tone: "rose",

    },

  ];

}



export function buildDashboardHomeMetrics(

  calls: CallRecord[],

  jobs: JobCard[],

  jobberBookings: JobberBookingRecord[],

  shop: Pick<
    ShopState,
    "scheduleWindows" | "answerScheduleActive" | "scheduleAlwaysOn" | "shopTimezone"
  >,

  requestStatuses: Record<string, RequestStatus> = {},

  jobberConnected = false,

  now = new Date(),

): DashboardHomeMetrics {

  const safeShop = normalizeShopState(shop);
  const afterHoursCtx = {
    scheduleActive: safeShop.answerScheduleActive,
    scheduleAlwaysOn: safeShop.scheduleAlwaysOn,
    scheduleRows:
      safeShop.answerScheduleActive && safeShop.scheduleWindows.length > 0
        ? parseRowsFromStored(safeShop.scheduleWindows)
        : [],
    timeZone: resolveShopTimezone(safeShop),
  };

  const monthRange = resolveMonthToDate(now);

  const prevRange = resolvePreviousMonthSamePeriod(now);



  const monthAnalytics = buildMissedCallsAnalytics(

    calls,

    safeShop,

    monthRange.start,

    monthRange.end,

  );

  const prevAnalytics = buildMissedCallsAnalytics(

    calls,

    safeShop,

    prevRange.start,

    prevRange.end,

  );



  const monthOps = buildOperationsMetrics(
    calls,
    jobs,
    monthRange.start,
    monthRange.end,
    jobberBookings,
    jobberConnected,
    requestStatuses,
    afterHoursCtx,
  );



  const trend30Start = new Date(now);

  trend30Start.setDate(now.getDate() - 29);

  const trend30 = buildMissedCallsAnalytics(calls, safeShop, trend30Start, now, {

    jobs,

    jobberBookings,

    requestStatuses,

  });



  const locale = isEnglishUi() ? "en-US" : "ko-KR";

  const rangeLabel = monthRange.start.toLocaleDateString(locale, {

    month: "short",

    day: "numeric",

  });

  const rangeEndLabel = monthRange.end.toLocaleDateString(locale, {

    month: "short",

    day: "numeric",

  });

  const compareLabel = `${rangeLabel} – ${rangeEndLabel}`;



  const emergencySpark = buildDailyEmergencyCounts(calls, trend30Start, now);



  return {

    rangeLabel: compareLabel,

    compareLabel: isEnglishUi() ? "This month" : "이번 달",

    missedPrevented: {

      value: monthAnalytics.missedCallsPrevented,

      display: String(monthAnalytics.missedCallsPrevented),

      deltaPct: pctChange(

        monthAnalytics.missedCallsPrevented,

        prevAnalytics.missedCallsPrevented,

      ),

      sparkline: sparklineFromDaily(trend30.dailyPrevented, "callsSaved"),

    },

    emergencyRequests: {

      value: monthOps.kpis.emergencyCalls,

      display: String(monthOps.kpis.emergencyCalls),

      deltaPct: monthOps.kpis.emergencyDelta,

      sparkline: emergencySpark.slice(-14),

    },

    conversionRate: {

      value: monthOps.kpis.conversionRate,

      display: `${monthOps.kpis.conversionRate}%`,

      deltaPct: monthOps.kpis.conversionDelta,

      sparkline: sparklineFromDaily(monthOps.bookingTrend, "bookings"),

    },

    aiAnswered: {

      value: monthAnalytics.aiAnsweredCalls,

      display: String(monthAnalytics.aiAnsweredCalls),

      deltaPct: pctChange(monthAnalytics.aiAnsweredCalls, prevAnalytics.aiAnsweredCalls),

      sparkline: sparklineFromDaily(

        trend30.dailyPrevented.map((d) => {

          const dayStart = new Date(d.date);

          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(d.date);

          dayEnd.setHours(23, 59, 59, 999);

          return {

            calls: filterByDateRange(calls, dayStart, dayEnd).length,

          };

        }),

        "calls",

      ),

    },

    insights: buildCallInsights(monthAnalytics, monthOps, prevAnalytics),

    dailyPrevented: trend30.dailyPrevented,

    pendingReviewCount: countPendingShopReviewBookings(

      requestStatuses,

      jobs,

      jobberBookings,

      calls,

    ),

  };

}



export function dashboardGreeting(now = new Date()): string {

  const h = now.getHours();

  if (isEnglishUi()) {

    if (h < 12) return "Good morning";

    if (h < 18) return "Good afternoon";

    return "Good evening";

  }

  if (h < 12) return "좋은 아침입니다";

  if (h < 18) return "좋은 오후입니다";

  return "좋은 저녁입니다";

}

