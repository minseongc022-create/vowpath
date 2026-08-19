import {
  EXTENSION_MERCHANT_PING_MIN,
  PICKUP_REMINDER_30_MIN,
  PICKUP_REMINDER_70_MIN,
  merchantOrderDeepLink,
  minutesUntilPickupEnd,
  reservationDeepLink,
  resolvePickupPolicy,
} from "./pickup-policy";
import {
  notifyCustomerPickupReminder,
  notifyMerchantExtensionPing,
  notifyMerchantExtensionRequest,
} from "./notify";
import type { GiuStore } from "./types";

export type PickupReminderResult = {
  customerReminders70: number;
  customerReminders30: number;
  merchantExtensionPings: number;
};

export async function runGiuPickupReminders(store: GiuStore): Promise<PickupReminderResult> {
  const now = Date.now();
  let customerReminders70 = 0;
  let customerReminders30 = 0;
  let merchantExtensionPings = 0;

  for (const res of store.reservations) {
    if (res.paymentStatus !== "paid" || res.status !== "giu_cho") continue;
    const box = store.boxes.find((b) => b.id === res.boxId);
    const merchant = store.merchants.find((m) => m.id === res.merchantId);
    if (!box || !merchant) continue;

    const minutesLeft = minutesUntilPickupEnd(box.pickupEnd, now);
    if (!res.pickupRemindersSent) res.pickupRemindersSent = {};

    if (
      minutesLeft <= PICKUP_REMINDER_70_MIN &&
      minutesLeft > PICKUP_REMINDER_30_MIN &&
      !res.pickupRemindersSent.at70
    ) {
      await notifyCustomerPickupReminder({
        phone: res.customerPhone,
        merchantName: merchant.name,
        kind: "70",
        link: reservationDeepLink(res.id, "rem70"),
      });
      res.pickupRemindersSent.at70 = new Date().toISOString();
      customerReminders70++;
    }

    if (
      minutesLeft <= PICKUP_REMINDER_30_MIN &&
      minutesLeft > 0 &&
      !res.pickupRemindersSent.at30
    ) {
      await notifyCustomerPickupReminder({
        phone: res.customerPhone,
        merchantName: merchant.name,
        kind: "30",
        link: reservationDeepLink(res.id, "rem30"),
      });
      res.pickupRemindersSent.at30 = new Date().toISOString();
      customerReminders30++;
    }

    if (res.extensionRequest?.status === "pending") {
      const lastPing = res.extensionRequest.merchantPingAt
        ? new Date(res.extensionRequest.merchantPingAt).getTime()
        : 0;
      const shouldPing =
        !lastPing || now - lastPing >= EXTENSION_MERCHANT_PING_MIN * 60_000;
      if (shouldPing) {
        if (!res.extensionRequest.merchantPingAt) {
          await notifyMerchantExtensionRequest({
            phone: merchant.phone,
            customerName: res.customerName,
            link: merchantOrderDeepLink(res.id),
          });
        } else {
          await notifyMerchantExtensionPing({
            phone: merchant.phone,
            customerName: res.customerName,
            link: merchantOrderDeepLink(res.id),
          });
        }
        res.extensionRequest.merchantPingAt = new Date().toISOString();
        merchantExtensionPings++;
      }
    }
  }

  return { customerReminders70, customerReminders30, merchantExtensionPings };
}
