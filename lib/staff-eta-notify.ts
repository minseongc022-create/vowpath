import { bookingShortRef } from "./booking-ref";
import { resolveBookingCustomerPhone } from "./booking-contact";
import { resolveShopDisplayName } from "./link-intake-brand";
import { normalizeSmsPhone } from "./phone";
import { resolveOwnerAlertPhone } from "./owner-alert-phone";
import { sendSms } from "./send-sms";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import {
  smsStaffEtaHint,
  smsTechOnMyWayAcceptedHint,
} from "./sms-templates";
import { findUserById } from "./users-db";

/** Staff ETA copy must never go to the customer phone (solo-test uses one device for both). */
export async function phonesShareCustomerLine(
  userId: string,
  bookingId: string,
  staffPhone?: string | null,
): Promise<boolean> {
  const customerPhone = await resolveBookingCustomerPhone(userId, bookingId);
  const customerNorm = customerPhone ? normalizeSmsPhone(customerPhone) : null;
  if (!customerNorm) return false;

  const line = staffPhone?.trim() || (await resolveOwnerAlertPhone(userId));
  const staffNorm = line ? normalizeSmsPhone(line) : null;
  return Boolean(staffNorm && staffNorm === customerNorm);
}

/** Staff-only ETA instructions — owner or tech line, never the customer. */
export async function notifyStaffEtaInstructions(params: {
  userId: string;
  bookingId: string;
  staffPhone?: string | null;
  customerName?: string;
  dedupeSuffix?: string;
}): Promise<void> {
  const targetPhone =
    params.staffPhone?.trim() || (await resolveOwnerAlertPhone(params.userId));
  if (!targetPhone) return;

  if (await phonesShareCustomerLine(params.userId, params.bookingId, targetPhone)) {
    return;
  }

  const suffix = params.dedupeSuffix ?? "staff_eta_instructions";
  const dedupeId = `${params.bookingId}:${suffix}`;
  if (!(await shouldSendSmsOnce(params.userId, dedupeId))) return;

  const user = await findUserById(params.userId);
  const body = params.customerName
    ? smsTechOnMyWayAcceptedHint({
        shopName: user?.shopName,
        customerName: params.customerName,
        ref: bookingShortRef(params.bookingId),
      })
    : `${resolveShopDisplayName(user?.shopName)} (staff): ${smsStaffEtaHint()}`;

  const result = await sendSms(targetPhone, body, "staff_eta_instructions", {
    context: {
      userId: params.userId,
      operation: "staff_eta_instructions",
      bookingId: params.bookingId,
    },
  });
  if (result.ok) await markSmsSent(params.userId, dedupeId);
}
