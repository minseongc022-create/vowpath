import {
  isApprovedBooking,
  isPendingShopReview,
  normalizeRequestStatus,
  REQUEST_STATUS_LABELS,
  type RequestStatus,
} from "../booking-policy";
import type { ShopBookingSettings, SchedulingMode } from "../booking-settings";
import { mergeUserBilling } from "../billing";
import type { CalendarEvent } from "../calendar-events";
import type { CallMemoryRecord } from "../call-memory";
import type { CompanyAiMemory } from "../company-ai-memory";
import type { CustomerVerificationRecord } from "../customer-verification/types";
import { isFullyLive } from "../integration-status";
import type { JobberBookingRecord } from "../jobber-bookings";
import { runtimeUiLocale, type UiLocale } from "../locale";
import type { CallRecord } from "../operations-analytics";
import {
  buildAllRecentBookings,
  type RecentBooking,
} from "../recent-bookings";
import type { ShopProfile } from "../shop-profile-db";
import type { JobCard } from "../types";
import type { UserRecord } from "../users-db";
import { isUrgentBooking, isUrgentCall } from "../urgent-requests";
import type { WorkflowRule } from "../workflow-rules/types";

export type AiContextSnapshot = {
  callsToday: number;
  pendingCount: number;
  urgentCount: number;
  todayVisits: number;
  weekBookings: number;
  integrationLive: boolean;
  jobberConnected: boolean;
};

export type AiBillingSummary = {
  plan: string;
  subscriptionStatus: string;
  flexBillableCount: number;
  paidAt?: string;
  nextBillingDate?: string | null;
};

export type AiContextPack = {
  userId: string;
  locale: UiLocale;
  now: Date;
  ownerName?: string;
  shopName?: string;
  calls: CallRecord[];
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  requestStatuses: Record<string, RequestStatus>;
  customerVerifications: CustomerVerificationRecord[];
  callMemory: CallMemoryRecord[];
  companyMemory: CompanyAiMemory;
  bookingSettings: ShopBookingSettings;
  shopProfile: ShopProfile;
  user: UserRecord;
  calendarEvents: CalendarEvent[];
  billing: AiBillingSummary;
  snapshot: AiContextSnapshot;
  bookings: RecentBooking[];
  workflowRules: WorkflowRule[];
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function weekStart(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function eventOnDay(event: CalendarEvent, day: Date): boolean {
  const start = new Date(event.startAt);
  return (
    start.getFullYear() === day.getFullYear() &&
    start.getMonth() === day.getMonth() &&
    start.getDate() === day.getDate()
  );
}

const MODE_LABEL: Record<SchedulingMode, { en: string; ko: string }> = {
  speed: { en: "Auto Book (Speed)", ko: "자동 확정 (Speed)" },
  hybrid: { en: "Hybrid (by priority)", ko: "하이브리드 (우선순위 선택)" },
  control: { en: "Manual approval (Control)", ko: "수동 승인 (Control)" },
};

export function schedulingModeLabel(mode: SchedulingMode, locale: UiLocale): string {
  return locale === "ko" ? MODE_LABEL[mode].ko : MODE_LABEL[mode].en;
}

export function buildAiContextPack(params: {
  userId: string;
  user: UserRecord;
  calls: CallRecord[];
  jobs: JobCard[];
  jobberBookings: JobberBookingRecord[];
  requestStatuses: Record<string, RequestStatus>;
  customerVerifications: CustomerVerificationRecord[];
  callMemory: CallMemoryRecord[];
  companyMemory: CompanyAiMemory;
  bookingSettings: ShopBookingSettings;
  shopProfile: ShopProfile;
  calendarEvents: CalendarEvent[];
  jobberConnected: boolean;
  nextBillingDate?: string | null;
  now?: Date;
  workflowRules?: WorkflowRule[];
}): AiContextPack {
  const now = params.now ?? new Date();
  const locale = runtimeUiLocale();
  const today = { start: startOfDay(now), end: endOfDay(now) };
  const week = { start: weekStart(now), end: endOfDay(now) };

  const bookings = buildAllRecentBookings(
    params.jobs,
    params.jobberBookings,
    params.calls,
    params.requestStatuses,
  );

  const bookingStatus = (b: RecentBooking) =>
    normalizeRequestStatus(params.requestStatuses[b.id] ?? b.status);

  const callsToday = params.calls.filter((c) => inRange(c.createdAt, today.start, today.end));
  const pending = bookings.filter((b) => isPendingShopReview(bookingStatus(b)));
  const urgent = bookings.filter(isUrgentBooking);
  const todayVisits = params.calendarEvents.filter((e) => eventOnDay(e, now));
  const weekApproved = bookings.filter(
    (b) => inRange(b.createdAt, week.start, week.end) && isApprovedBooking(bookingStatus(b)),
  );

  const billingUser = mergeUserBilling(params.user);

  return {
    userId: params.userId,
    locale,
    now,
    ownerName: params.user.shopName?.trim() || params.user.email?.split("@")[0],
    shopName: params.user.shopName,
    calls: params.calls,
    jobs: params.jobs,
    jobberBookings: params.jobberBookings,
    requestStatuses: params.requestStatuses,
    customerVerifications: params.customerVerifications,
    callMemory: params.callMemory,
    companyMemory: params.companyMemory,
    bookingSettings: params.bookingSettings,
    shopProfile: params.shopProfile,
    user: params.user,
    calendarEvents: params.calendarEvents,
    billing: {
      plan: billingUser.plan ?? "none",
      subscriptionStatus: billingUser.subscriptionStatus ?? "none",
      flexBillableCount: billingUser.flexBillableCount ?? 0,
      paidAt: billingUser.paidAt,
      nextBillingDate: params.nextBillingDate ?? null,
    },
    snapshot: {
      callsToday: callsToday.length,
      pendingCount: pending.length,
      urgentCount: urgent.length,
      todayVisits: todayVisits.length,
      weekBookings: weekApproved.length,
      integrationLive: isFullyLive(params.shopProfile, {
        jobberConnected: params.jobberConnected,
        contactComplete: true,
      }),
      jobberConnected: params.jobberConnected,
    },
    bookings,
    workflowRules: params.workflowRules ?? [],
  };
}

export function snapshotLines(pack: AiContextPack): string[] {
  const loc = pack.locale;
  if (loc === "ko") {
    return [
      `오늘 통화 ${pack.snapshot.callsToday}건`,
      `승인 대기 ${pack.snapshot.pendingCount}건`,
      `긴급 요청 ${pack.snapshot.urgentCount}건`,
      `오늘 방문 ${pack.snapshot.todayVisits}건`,
    ];
  }
  return [
    `${pack.snapshot.callsToday} call${pack.snapshot.callsToday === 1 ? "" : "s"} today`,
    `${pack.snapshot.pendingCount} pending approval${pack.snapshot.pendingCount === 1 ? "" : "s"}`,
    `${pack.snapshot.urgentCount} urgent request${pack.snapshot.urgentCount === 1 ? "" : "s"}`,
    `${pack.snapshot.todayVisits} visit${pack.snapshot.todayVisits === 1 ? "" : "s"} today`,
  ];
}

export function bookingStatusOf(pack: AiContextPack, booking: RecentBooking): RequestStatus {
  return normalizeRequestStatus(pack.requestStatuses[booking.id] ?? booking.status);
}

export { startOfDay, endOfDay, weekStart, inRange, eventOnDay, REQUEST_STATUS_LABELS };
export { isUrgentBooking, isUrgentCall };
