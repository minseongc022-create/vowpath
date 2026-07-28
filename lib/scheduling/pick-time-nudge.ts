/**
 * If a customer never opens the pick-time SMS link after phone intake,
 * nudge them once, then escalate to the shop owner.
 *
 * Runs from the 60s tech-dispatch cron (cron-job.org).
 */

import { listCallLogs } from "../call-logs";
import { getScheduledBooking } from "../schedule-bookings-db";
import { getRequestStatuses } from "../requests-db";
import { lookupStoredRequestStatus } from "../request-status-resolve";
import { normalizeRequestStatus } from "../booking-policy";
import { listUsers, findUserById } from "../users-db";
import { resolveOwnerAlertPhone } from "../owner-alert-phone";
import { buildBookingPortalUrl } from "../portal-url";
import { sendSms } from "../send-sms";
import { sendSmsMessages } from "../sms-link-delivery";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { setSmsReplyTarget } from "../sms-reply-context";
import {
  smsCustomerPickTimeReminderMessages,
  smsOwnerPickTimeStaleBody,
} from "../sms-templates";
import { withPracticeSmsPrefix } from "../practice-sms";
import { getShopBookingSettings } from "../shop-settings-db";
import { isPracticeMode } from "../data-truthfulness";

/** Customer reminder if they still have not picked a window. */
const CUSTOMER_NUDGE_AFTER_MS = 90 * 60 * 1000;
/** Owner escalate if still no window after this. */
const OWNER_ESCALATE_AFTER_MS = 4 * 60 * 60 * 1000;
/** Don't keep nudging forever — ignore calls older than this. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function bookingIdForCall(callId: string): string {
  return `call-${callId}`;
}

export async function processPickTimeNudgesForUser(userId: string): Promise<{
  customerNudges: number;
  ownerEscalations: number;
}> {
  let customerNudges = 0;
  let ownerEscalations = 0;

  const [calls, statuses, user, settings] = await Promise.all([
    listCallLogs(userId),
    getRequestStatuses(userId),
    findUserById(userId),
    getShopBookingSettings(userId),
  ]);
  const practiceMode = isPracticeMode(settings);
  const shopName = user?.shopName ?? "";
  const now = Date.now();

  for (const call of calls) {
    if (!call.portalToken) continue;
    const created = new Date(call.createdAt).getTime();
    if (!Number.isFinite(created)) continue;
    const age = now - created;
    if (age < CUSTOMER_NUDGE_AFTER_MS || age > MAX_AGE_MS) continue;

    const bookingId = bookingIdForCall(call.id);
    const scheduled = await getScheduledBooking(userId, bookingId);
    if (scheduled?.scheduledStartAt) continue;

    const status = normalizeRequestStatus(
      lookupStoredRequestStatus(bookingId, statuses) ?? "pending_review",
    );
    if (status === "rejected" || status === "completed") continue;

    // Already has a concrete window string from an older verbal path — skip.
    const window = (call.arrivalWindow ?? "").trim();
    if (
      window &&
      !/^not set yet/i.test(window) &&
      !/^pending/i.test(window) &&
      !/^tbd$/i.test(window)
    ) {
      continue;
    }

    const phone = (call.callbackPhone || call.from || "").trim();
    const portalUrl = buildBookingPortalUrl(call.portalToken);
    const customerName = call.customerName?.trim() || "Customer";
    const issue = call.issueType || call.symptom || "service request";

    if (age >= CUSTOMER_NUDGE_AFTER_MS && phone) {
      const dedupeId = `${bookingId}:pick_time_nudge`;
      if (await shouldSendSmsOnce(userId, dedupeId)) {
        const messages = smsCustomerPickTimeReminderMessages({
          shopName,
          customerName,
          portalUrl,
        }).map((part) => withPracticeSmsPrefix(part, practiceMode));
        const result = await sendSmsMessages(phone, messages, "customer_pick_time_nudge", {
          context: { userId, operation: "customer_pick_time_nudge", bookingId },
        });
        if (result.ok) {
          await markSmsSent(userId, dedupeId);
          customerNudges += 1;
        }
      }
    }

    if (age >= OWNER_ESCALATE_AFTER_MS) {
      const ownerPhone = await resolveOwnerAlertPhone(userId);
      if (!ownerPhone) continue;
      const dedupeId = `${bookingId}:pick_time_owner`;
      if (!(await shouldSendSmsOnce(userId, dedupeId))) continue;
      await setSmsReplyTarget(userId, bookingId);
      const body = smsOwnerPickTimeStaleBody({
        shopName,
        customerName,
        issue,
        phone,
      });
      const result = await sendSms(ownerPhone, body, "owner_pick_time_stale", {
        context: { userId, operation: "owner_pick_time_stale", bookingId },
      });
      if (result.ok) {
        await markSmsSent(userId, dedupeId);
        ownerEscalations += 1;
      }
    }
  }

  return { customerNudges, ownerEscalations };
}

export async function processPickTimeNudgesAll(): Promise<{
  users: number;
  customerNudges: number;
  ownerEscalations: number;
}> {
  const users = await listUsers();
  let customerNudges = 0;
  let ownerEscalations = 0;
  for (const user of users) {
    try {
      const r = await processPickTimeNudgesForUser(user.id);
      customerNudges += r.customerNudges;
      ownerEscalations += r.ownerEscalations;
    } catch (e) {
      console.warn("[pick-time-nudge]", user.id, e);
    }
  }
  return { users: users.length, customerNudges, ownerEscalations };
}
