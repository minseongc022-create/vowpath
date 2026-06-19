import { sendSms } from "../send-sms";
import { resolveShopDisplayName } from "../link-intake-brand";
import { findUserById } from "../users-db";
import {
  getAgreementKeeperSettings,
  listAgreements,
  saveAgreement,
} from "./store";
import {
  daysUntilRenewal,
  formatAgreementPrice,
  type MaintenanceAgreement,
} from "./types";

function reminderKey(role: "owner" | "customer", days: number): string {
  return `${role}_${days}`;
}

function alreadySent(agreement: MaintenanceAgreement, key: string): boolean {
  return Boolean(agreement.remindersSent?.[key]);
}

async function markReminderSent(agreement: MaintenanceAgreement, key: string) {
  agreement.remindersSent = { ...agreement.remindersSent, [key]: new Date().toISOString() };
  agreement.updatedAt = new Date().toISOString();
  await saveAgreement(agreement);
}

export async function processAgreementRemindersForUser(userId: string): Promise<{
  ownerSent: number;
  customerSent: number;
}> {
  const settings = await getAgreementKeeperSettings(userId);
  if (!settings.enabled) return { ownerSent: 0, customerSent: 0 };

  const user = await findUserById(userId);
  const shopName = resolveShopDisplayName(user?.shopName);
  const ownerPhone = user?.phone?.trim();
  const agreements = await listAgreements(userId);
  let ownerSent = 0;
  let customerSent = 0;

  for (const agreement of agreements) {
    if (agreement.status !== "active") continue;
    const daysLeft = daysUntilRenewal(agreement.renewalDate);
    if (daysLeft < 0) continue;

    const price = formatAgreementPrice(agreement.annualPriceCents);

    for (const days of settings.ownerReminderDays) {
      const key = reminderKey("owner", days);
      if (daysLeft !== days || alreadySent(agreement, key)) continue;
      if (!ownerPhone) continue;

      const body = [
        `${shopName} PM: ${agreement.customerName} renews in ${days}d.`,
        `${agreement.planName} — ${price}/yr.`,
        agreement.serviceAddress,
      ].join(" ");

      const result = await sendSms(ownerPhone, body, "agreement_owner_reminder", {
        context: { userId, operation: "agreement_owner_reminder" },
      });
      if (result.ok) {
        await markReminderSent(agreement, key);
        ownerSent += 1;
      }
    }

    for (const days of settings.customerReminderDays) {
      const key = reminderKey("customer", days);
      if (daysLeft !== days || alreadySent(agreement, key)) continue;

      const body = [
        `${shopName}: Your ${agreement.planName} renews in ${days} days (${price}/yr).`,
        "Reply if you'd like to schedule your next tune-up or have questions.",
      ].join(" ");

      const result = await sendSms(agreement.customerPhone, body, "agreement_customer_reminder", {
        context: { userId, operation: "agreement_customer_reminder" },
      });
      if (result.ok) {
        await markReminderSent(agreement, key);
        customerSent += 1;
      }
    }
  }

  return { ownerSent, customerSent };
}

export async function processAgreementRemindersAll(): Promise<{
  users: number;
  ownerSent: number;
  customerSent: number;
}> {
  const { listUsers } = await import("../users-db");
  const users = await listUsers();
  let ownerSent = 0;
  let customerSent = 0;

  for (const user of users) {
    const result = await processAgreementRemindersForUser(user.id);
    ownerSent += result.ownerSent;
    customerSent += result.customerSent;
  }

  return { users: users.length, ownerSent, customerSent };
}
