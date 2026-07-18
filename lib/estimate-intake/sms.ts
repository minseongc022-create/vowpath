import {
  reportOwnerPhoneMisconfigured,
  resolveOwnerAlertPhone,
} from "../owner-alert-phone";
import { sendSms } from "../send-sms";
import { resolveShopDisplayName } from "../shop-display-name";
import { smsTruncate } from "../sms-templates";
import { findUserById } from "../users-db";
import type { EstimateAnswers } from "./types";
import { setPendingEstimateReply } from "../estimate-reply-store";

export function estimateRequestSmsBody(params: {
  shopName?: string;
  answers: EstimateAnswers;
  summary: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const name = smsTruncate(params.answers.name?.trim() || "Caller", 24);
  const phone = params.answers.callbackPhone?.trim() || "No callback number";
  return `${shop} 📋 ESTIMATE REQUEST\n${name} — ${phone}\n${params.summary}\nReply with your message to send to customer, or call them directly.`;
}

/** Texts the shop owner a clean summary of a phone-collected estimate request.
 * Best-effort — logs a misconfiguration report instead of throwing if no owner phone
 * is on file, since the caller has already hung up by the time this runs. */
export async function notifyOwnerEstimateRequest(params: {
  userId: string;
  callSid: string;
  answers: EstimateAnswers;
  summary: string;
}): Promise<void> {
  const user = await findUserById(params.userId);
  const ownerPhone = await resolveOwnerAlertPhone(params.userId);

  if (!ownerPhone) {
    await reportOwnerPhoneMisconfigured({
      userId: params.userId,
      operation: "owner_estimate_request",
    });
    console.warn(
      `[estimate-intake] skip owner_estimate_request — no owner phone (call ${params.callSid})`,
    );
    return;
  }

  const body = estimateRequestSmsBody({
    shopName: user?.shopName,
    answers: params.answers,
    summary: params.summary,
  });

  await sendSms(ownerPhone, body, "owner_estimate_request", {
    context: {
      userId: params.userId,
      operation: "owner_estimate_request",
      callSid: params.callSid,
    },
  });

  const customerPhone = params.answers.callbackPhone?.trim();
  if (customerPhone) {
    await setPendingEstimateReply(params.userId, {
      userId: params.userId,
      callSid: params.callSid,
      customerPhone,
      customerName: params.answers.name?.trim() || "Customer",
      createdAt: new Date().toISOString(),
    });
  }
}
