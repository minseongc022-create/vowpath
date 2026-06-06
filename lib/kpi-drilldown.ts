import {
  isApprovedBooking,
  isWaitingCustomer,
  normalizeRequestStatus,
  type RequestStatus,
} from "./booking-policy";
import { filterByDateRange, parseDateInput } from "./dashboard-analytics";
import type { CustomerVerificationRecord } from "./customer-verification/types";
import type { JobberBookingRecord } from "./jobber-bookings";
import {
  isAiHandledCall,
  isLikelyMissedWithoutAi,
  parseShopScheduleRows,
} from "./missed-calls-prevented";
import { isEmergencyPriority, type CallRecord } from "./operations-analytics";
import {
  buildAllRecentBookings,
  type RecentBooking,
} from "./recent-bookings";
import { lookupStoredRequestStatus } from "./request-status-resolve";
import type { TrendChartSeriesId } from "./trend-chart-series";
import type { JobCard, ShopState } from "./types";

export type KpiDrilldownId = TrendChartSeriesId | "customerVerification";

export type KpiDrilldownItem =
  | { kind: "call"; id: string; call: CallRecord }
  | { kind: "booking"; id: string; booking: RecentBooking; status: RequestStatus }
  | { kind: "verification"; id: string; record: CustomerVerificationRecord };

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function inCreatedRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function bookingStatus(
  booking: RecentBooking,
  statuses: Record<string, RequestStatus>,
): RequestStatus {
  return (
    lookupStoredRequestStatus(booking.id, statuses, booking.jobberJobId) ??
    normalizeRequestStatus(booking.status)
  );
}

export function buildKpiDrilldownItems(
  kpiId: KpiDrilldownId,
  params: {
    calls: CallRecord[];
    jobs: JobCard[];
    jobberBookings: JobberBookingRecord[];
    requestStatuses: Record<string, RequestStatus>;
    shop: Pick<ShopState, "scheduleWindows" | "answerScheduleActive">;
    dateRange: { start: string; end: string };
    customerVerifications: CustomerVerificationRecord[];
  },
): KpiDrilldownItem[] {
  const start = parseDateInput(params.dateRange.start);
  const end = parseDateInput(params.dateRange.end);
  if (!start || !end) return [];
  const rangeEnd = endOfDay(end);
  const inRangeCalls = filterByDateRange(params.calls, start, rangeEnd);

  const scheduleRows =
    params.shop.answerScheduleActive && params.shop.scheduleWindows.length > 0
      ? parseShopScheduleRows(params.shop.scheduleWindows)
      : [];

  const allBookings = buildAllRecentBookings(
    params.jobs,
    params.jobberBookings,
    params.calls,
    params.requestStatuses,
  );

  switch (kpiId) {
    case "callsSaved": {
      return inRangeCalls
        .filter(
          (call) =>
            isAiHandledCall(call) &&
            isLikelyMissedWithoutAi(
              call.createdAt,
              scheduleRows,
              params.shop.answerScheduleActive,
            ),
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((call) => ({ kind: "call" as const, id: call.id, call }));
    }
    case "waitingCustomers": {
      return allBookings
        .filter((b) => isWaitingCustomer(bookingStatus(b, params.requestStatuses)))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((booking) => ({
          kind: "booking" as const,
          id: booking.id,
          booking,
          status: bookingStatus(booking, params.requestStatuses),
        }));
    }
    case "emergency": {
      return inRangeCalls
        .filter((call) => isEmergencyPriority(call.priority))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((call) => ({ kind: "call" as const, id: call.id, call }));
    }
    case "bookedJobs": {
      return allBookings
        .filter((b) => {
          if (!inCreatedRange(b.createdAt, start, rangeEnd)) return false;
          return isApprovedBooking(bookingStatus(b, params.requestStatuses));
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((booking) => ({
          kind: "booking" as const,
          id: booking.id,
          booking,
          status: bookingStatus(booking, params.requestStatuses),
        }));
    }
    case "inboundCalls": {
      return inRangeCalls
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((call) => ({ kind: "call" as const, id: call.id, call }));
    }
    case "customerVerification": {
      return [...params.customerVerifications]
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
        .map((record) => ({
          kind: "verification" as const,
          id: record.id,
          record,
        }));
    }
    default:
      return [];
  }
}
