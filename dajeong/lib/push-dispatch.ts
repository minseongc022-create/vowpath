import "server-only";

import webpush from "web-push";
import { listSubscriptions, removeSubscriptionById } from "./notification-store";
import type { DajeongNotification, PushSubscriptionRecord } from "./types";

let configured = false;

function vapidConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

function ensureConfigured(): boolean {
  if (!vapidConfigured()) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT?.trim() || "mailto:support@effiroad.com",
      process.env.VAPID_PUBLIC_KEY!.trim(),
      process.env.VAPID_PRIVATE_KEY!.trim(),
    );
    configured = true;
  }
  return true;
}

export type DispatchResult = { delivered: number; failed: number; expiredRemoved: number };

/**
 * Sends one notification to every device this person has subscribed from. An expired/unsubscribed
 * endpoint (410/404 from the push service) is removed from the store right away so the next
 * sweep stops retrying it — a dead subscription otherwise fails forever and wastes every future
 * cycle. Without VAPID keys configured, this deliberately no-ops (returns delivered: 0) rather
 * than pretending to send — see the final report for what "real push delivery" was and wasn't
 * verified in this environment.
 */
export async function dispatchToPerson(personId: string, notification: DajeongNotification): Promise<DispatchResult> {
  if (!ensureConfigured()) return { delivered: 0, failed: 0, expiredRemoved: 0 };
  const subscriptions = await listSubscriptions(personId);
  let delivered = 0;
  let failed = 0;
  let expiredRemoved = 0;
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    deepLink: notification.deepLink,
    notificationId: notification.id,
  });
  await Promise.all(subscriptions.map(async (subscription: PushSubscriptionRecord) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload);
      delivered += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await removeSubscriptionById(personId, subscription.id);
        expiredRemoved += 1;
      } else {
        failed += 1;
      }
    }
  }));
  return { delivered, failed, expiredRemoved };
}

export function pushDeliveryConfigured(): boolean {
  return vapidConfigured();
}
