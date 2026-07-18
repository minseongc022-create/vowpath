import { smsCustomerOptOut } from "./sms-templates";
import { sendSms } from "./send-sms";
import { resolveShopDisplayName } from "./shop-display-name";
import { findUserByPhone } from "./users-db";
import { normalizeSmsPhone } from "./phone";
import {
  clearPendingEstimateReply,
  getPendingEstimateReply,
} from "./estimate-reply-store";
import { parseOwnerSmsReplyCode } from "./owner-sms-reply";

export function estimateRelaySmsBody(params: {
  shopName?: string;
  customerName: string;
  ownerMessage: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const first = params.customerName.split(/\s+/)[0] || "there";
  const msg = params.ownerMessage.trim();
  return `${shop}: Hi ${first}! Re: your estimate request — ${msg}${smsCustomerOptOut()}`;
}

export type EstimateOwnerReplyResult =
  | { handled: false }
  | { handled: true; replyBody: string };

/**
 * When the shop owner texts a free-form reply (not 1/2/9), relay it to the
 * customer who requested an estimate.
 */
export async function handleEstimateOwnerReply(params: {
  from: string;
  body: string;
}): Promise<EstimateOwnerReplyResult> {
  const body = params.body.trim();
  if (!body || parseOwnerSmsReplyCode(body)) return { handled: false };

  const ownerPhone = normalizeSmsPhone(params.from);
  if (!ownerPhone) return { handled: false };
  const owner = await findUserByPhone(ownerPhone);
  if (!owner) return { handled: false };

  const pending = await getPendingEstimateReply(owner.id);
  if (!pending) return { handled: false };

  const customerPhone = normalizeSmsPhone(pending.customerPhone);
  if (!customerPhone) return { handled: false };

  const smsBody = estimateRelaySmsBody({
    shopName: owner.shopName,
    customerName: pending.customerName,
    ownerMessage: body,
  });

  await sendSms(customerPhone, smsBody, "estimate_relay_to_customer", {
    context: {
      userId: owner.id,
      operation: "estimate_relay_to_customer",
      callSid: pending.callSid,
    },
  });

  await clearPendingEstimateReply(owner.id);

  return {
    handled: true,
    replyBody: `Sent to ${pending.customerName.split(/\s+/)[0] || "customer"}. They'll get your message by text.`,
  };
}
