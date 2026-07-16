import { listCallLogs } from "./call-logs";
import { listJobs } from "./jobs-db";
import type { GeneratedJobCard } from "./job-card-ai";
import { persistRequestStatusForBooking } from "./booking-status-sync";
import { pushJobberWhenApproved } from "./jobber-on-approve";
import { logOperationFailure } from "./ops-failures";
import { getShopBookingSettings } from "./shop-settings-db";
import {
  notifyCustomerScheduled,
  notifyOwnerScheduledFyi,
  notifyOwnerUrgentAutoBooked,
} from "./scheduling/schedule-sms";
import { notifyCustomerApproved } from "./customer-sms";
import type { JobPriority } from "./types";

/** Calendar confirmed — customer SMS, owner heads-up, Jobber, tech dispatch. */
export async function completeAutoConfirmedBooking(params: {
  userId: string;
  bookingId: string;
  callLogId: string;
  card: GeneratedJobCard;
  priority: JobPriority;
  customerPhone?: string | null;
  window: string;
  status: "scheduled" | "approved";
}): Promise<void> {
  const settings = await getShopBookingSettings(params.userId);

  await persistRequestStatusForBooking(params.userId, params.bookingId, params.status, {
    skipCustomerSms: true,
  });

  if (params.status === "scheduled") {
    await notifyCustomerScheduled({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: params.customerPhone,
      window: params.window,
      address: params.card.address,
      priority: params.priority,
    });
  } else {
    await notifyCustomerApproved({
      userId: params.userId,
      bookingId: params.bookingId,
      phone: params.customerPhone,
    });
  }

  if (params.priority === "P1") {
    await notifyOwnerUrgentAutoBooked({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.card.customerName,
      issue: params.card.symptom,
      window: params.window,
      undoMinutes: settings.undoWindowMinutes,
    });
  } else {
    await notifyOwnerScheduledFyi({
      userId: params.userId,
      bookingId: params.bookingId,
      customerName: params.card.customerName,
      issue: params.card.symptom,
      window: params.window,
      undoMinutes: settings.undoWindowMinutes,
    });
  }

  const [callLogs, jobs] = await Promise.all([
    listCallLogs(params.userId),
    listJobs(params.userId),
  ]);
  try {
    await pushJobberWhenApproved(
      params.userId,
      params.bookingId,
      "approved",
      callLogs,
      jobs,
    );
  } catch (e) {
    await logOperationFailure({
      userId: params.userId,
      category: "jobber",
      operation: "autoConfirmJobber",
      message: e instanceof Error ? e.message : "Jobber sync failed",
      retryable: true,
      payload: { bookingId: params.bookingId },
    });
  }
}
