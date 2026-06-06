import type { RequestStatus } from "./booking-policy";
import { REQUEST_STATUSES } from "./booking-policy";
import {
  getRequestStatuses,
  setRequestStatus,
  setRequestStatusesBulk,
} from "./requests-db";

export type { RequestStatus };
export { REQUEST_STATUSES };

/** @deprecated Prefer getRequestStatuses from requests-db */
export async function getBookingRequestStatuses(userId: string) {
  return getRequestStatuses(userId);
}

/** @deprecated use getRequestStatuses */
export const getBookingWorkflowStatuses = getBookingRequestStatuses;

export async function setBookingRequestStatus(
  userId: string,
  bookingId: string,
  status: RequestStatus,
) {
  return setRequestStatus(userId, bookingId, status);
}

export async function setBookingRequestStatusesBulk(
  userId: string,
  updates: Record<string, RequestStatus>,
) {
  return setRequestStatusesBulk(userId, updates);
}

/** @deprecated use setRequestStatus */
export const setBookingWorkflowStatus = setBookingRequestStatus;
