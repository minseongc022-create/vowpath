import "server-only";

import { createHmac } from "node:crypto";
import type { ReservationNotification } from "./reservation-ops-types";
import type { ReservationStateStore } from "./reservation-queue";

export interface HaruwithNotificationProvider {
  id: string;
  deliver(notification: ReservationNotification): Promise<{ delivered: boolean }>;
}

export const inAppNotificationProvider: HaruwithNotificationProvider = {
  id: "in_app",
  async deliver() { return { delivered: true }; },
};

export const webhookNotificationProvider: HaruwithNotificationProvider = {
  id: "webhook",
  async deliver(notification) {
    const url = process.env.HARUWITH_NOTIFICATION_WEBHOOK_URL?.trim();
    const secret = process.env.HARUWITH_NOTIFICATION_WEBHOOK_SECRET?.trim();
    if (!url || !secret) return { delivered: false };
    const body = JSON.stringify(notification);
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-haruwith-signature": signature }, body });
    return { delivered: response.ok };
  },
};

export async function deliverReservationNotifications(store: ReservationStateStore, provider: HaruwithNotificationProvider = webhookNotificationProvider): Promise<number> {
  const state = await store.read();
  const now = new Date();
  const pending = state.notifications.filter((notification) => ["provider_pending", "failed"].includes(notification.delivery) && (notification.deliveryAttempts ?? 0) < 5 && (!notification.nextDeliveryAt || new Date(notification.nextDeliveryAt) <= now));
  let delivered = 0;
  for (const notification of pending) {
    const result = await provider.deliver(notification).catch(() => ({ delivered: false }));
    await store.update((draft) => {
      const current = draft.notifications.find((entry) => entry.id === notification.id);
      if (!current) return;
      current.deliveryAttempts = (current.deliveryAttempts ?? 0) + 1;
      current.delivery = result.delivered ? "delivered" : "failed";
      current.nextDeliveryAt = result.delivered ? undefined : new Date(now.getTime() + Math.min(30, 2 ** current.deliveryAttempts) * 60_000).toISOString();
      current.lastDeliveryError = result.delivered ? undefined : "Notification provider가 전달 성공을 확인하지 않았어요.";
    });
    if (result.delivered) delivered += 1;
  }
  return delivered;
}
