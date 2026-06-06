import { findUserById } from "./users-db";
import { resolveShopDisplayName } from "./link-intake-brand";
import { sendSms } from "./send-sms";
import { markSmsSent, shouldSendSmsOnce } from "./sms-dedupe";
import type { JobPriority } from "./types";
import { notifyOwnerLinkIntakeUpdatedEmail } from "./owner-email-notify";
import {
  reportOwnerPhoneMisconfigured,
  resolveOwnerAlertPhone,
} from "./owner-alert-phone";

export function smsOwnerLinkIntakeUpdatedBody(params: {
  shopName?: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = params.customerName?.trim() || "Customer";
  const issue = params.issueType?.trim() || "Service request";
  const place =
    params.cityState?.trim() && params.cityState !== "—"
      ? ` · ${params.cityState}`
      : "";
  const addr = params.address?.trim() ? `\nAddress: ${params.address}` : "";
  const tag = params.priority === "P1" ? "URGENT" : params.priority;
  return (
    `${shop}: Customer updated their SMS link request (${tag}).\n` +
    `${name} — ${issue}${place}${addr}\n` +
    `Reply 1=Approve, 2=Reject when ready.`
  );
}

export async function notifyOwnerLinkIntakeUpdated(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  issueType: string;
  address: string;
  cityState?: string;
  priority: JobPriority;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);
  const body = smsOwnerLinkIntakeUpdatedBody({
    shopName: user?.shopName,
    customerName: params.customerName,
    issueType: params.issueType,
    address: params.address,
    cityState: params.cityState,
    priority: params.priority,
  });

  const dedupeId = `${params.bookingId}:link_update:${Date.now()}`;

  if (ownerPhone) {
    const allowed = await shouldSendSmsOnce(params.userId, dedupeId);
    if (allowed) {
      const result = await sendSms(ownerPhone, body, "owner_link_intake_updated", {
        context: {
          userId: params.userId,
          operation: "owner_link_intake_updated",
          bookingId: params.bookingId,
        },
      });
      if (result.ok) {
        await markSmsSent(params.userId, dedupeId);
      }
    }
  } else {
    await reportOwnerPhoneMisconfigured({
      userId: params.userId,
      operation: "owner_link_intake_updated",
      bookingId: params.bookingId,
    });
    console.warn(
      `[owner-sms] skip link intake update — shop US phone missing (booking ${params.bookingId})`,
    );
  }

  try {
    await notifyOwnerLinkIntakeUpdatedEmail(params);
  } catch (e) {
    console.warn("[link-intake] owner update email", e);
  }
}
