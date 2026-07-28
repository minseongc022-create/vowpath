import { resolveOwnerAlertPhone } from "../owner-alert-phone";
import { sendSms } from "../send-sms";
import { markSmsSent, shouldSendSmsOnce } from "../sms-dedupe";
import { setSmsReplyTarget } from "../sms-reply-context";
import { findUserById } from "../users-db";
import { bookingShortRef } from "../booking-ref";
import { resolveShopDisplayName } from "../link-intake-brand";
import { smsOwnerTag } from "../sms-templates";

/** Alert owner when every crew member passed / timed out on a job offer. */
export async function notifyOwnerNoCrewAccepted(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issue: string;
  window: string;
  priority: string;
}): Promise<void> {
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  if (!ownerPhone) return;

  const dedupeId = `${params.bookingId}:owner_no_crew`;
  if (!(await shouldSendSmsOnce(params.userId, dedupeId))) return;

  const user = await findUserById(params.userId);
  const shop = resolveShopDisplayName(user?.shopName);
  const ref = bookingShortRef(params.bookingId);
  const body =
    `${smsOwnerTag()} ${shop}: No crew accepted yet (${params.priority}). ` +
    `${params.customerName} · ${params.issue} · ${params.window}. ` +
    `Ref ${ref}. Assign manually in the dashboard or text a tech.`;

  await setSmsReplyTarget(params.userId, params.bookingId);
  const result = await sendSms(ownerPhone, body, "owner_no_crew", {
    context: {
      userId: params.userId,
      operation: "owner_no_crew",
      bookingId: params.bookingId,
    },
  });
  if (result.ok) await markSmsSent(params.userId, dedupeId);
}
