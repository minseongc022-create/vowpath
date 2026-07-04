import { getShopProfile } from "./shop-profile-db";
import type { JobPriority } from "./types";

/**
 * Fire-and-forget POST to the shop's "Webhooks by Zapier" Catch Hook, if configured.
 * Lets an owner build a Zap on any new request (log to a spreadsheet, push to another
 * CRM, post to Slack, etc.) without Effiroad needing to integrate with that CRM directly.
 */
export async function notifyZapierNewRequest(params: {
  userId: string;
  bookingId: string;
  customerName: string;
  phone?: string;
  issueType?: string;
  symptom?: string;
  address?: string;
  priority: JobPriority;
  createdAt: string;
}): Promise<void> {
  try {
    const profile = await getShopProfile(params.userId);
    const webhookUrl = profile.zapierWebhookUrl?.trim();
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "new_request",
        bookingId: params.bookingId,
        customerName: params.customerName,
        phone: params.phone ?? null,
        issueType: params.issueType ?? null,
        symptom: params.symptom ?? null,
        address: params.address ?? null,
        priority: params.priority,
        createdAt: params.createdAt,
      }),
    });
  } catch (e) {
    console.warn("[zapier-webhook] new_request", e);
  }
}
