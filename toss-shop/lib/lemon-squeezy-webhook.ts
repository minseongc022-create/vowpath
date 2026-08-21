import {
  accountIdFromLsWebhook,
  isTossShopLsEvent,
  type TossShopLsWebhook,
} from "./lemon-squeezy";
import {
  applyTossShopSubscription,
  findAccountByEmail,
  findAccountByLsCustomerId,
  upgradeAccountToPro,
} from "./store";
import type { TossShopSubscriptionStatus } from "./types";

function parseRenewsAt(attrs: Record<string, unknown> | undefined): string | undefined {
  const raw = attrs?.renews_at ?? attrs?.ends_at;
  return typeof raw === "string" ? raw : undefined;
}

function emailFromPayload(payload: TossShopLsWebhook): string | undefined {
  const attrs = payload.data?.attributes;
  if (!attrs) return undefined;
  if (typeof attrs.user_email === "string") return attrs.user_email;
  if (typeof attrs.customer_email === "string") return attrs.customer_email;
  return undefined;
}

function mapLsStatus(status: unknown): TossShopSubscriptionStatus {
  const s = String(status ?? "").toLowerCase();
  if (s === "active") return "active";
  if (s === "past_due") return "past_due";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "expired") return "expired";
  if (s === "paused") return "paused";
  return "expired";
}

async function resolveAccount(payload: TossShopLsWebhook) {
  const accountId = accountIdFromLsWebhook(payload);
  if (accountId) {
    const { getAccount } = await import("./store");
    const account = await getAccount(accountId);
    if (account) return account;
  }

  const attrs = payload.data?.attributes;
  const customerId =
    attrs?.customer_id != null ? String(attrs.customer_id) : undefined;
  if (customerId) {
    const byCustomer = await findAccountByLsCustomerId(customerId);
    if (byCustomer) return byCustomer;
  }

  const email = emailFromPayload(payload);
  if (email) return findAccountByEmail(email);

  return null;
}

/** Returns true when payload was a toss-shop event and was handled. */
export async function handleTossShopLsWebhook(payload: TossShopLsWebhook): Promise<boolean> {
  if (!isTossShopLsEvent(payload)) return false;

  const event = payload.meta?.event_name ?? "";
  const attrs = payload.data?.attributes;
  const subscriptionId = payload.data?.id;

  const account = await resolveAccount(payload);
  if (!account) {
    console.warn("[toss-shop/ls/webhook] no account for event", event);
    return true;
  }

  if (account.plan === "owner") return true;

  switch (event) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed": {
      await applyTossShopSubscription(account.id, {
        lsCustomerId:
          attrs?.customer_id != null ? String(attrs.customer_id) : account.lsCustomerId,
        lsSubscriptionId: subscriptionId ?? account.lsSubscriptionId,
        subscriptionStatus: mapLsStatus(attrs?.status),
        proExpiresAt: parseRenewsAt(attrs),
      });
      break;
    }
    case "subscription_cancelled":
    case "subscription_expired": {
      await applyTossShopSubscription(account.id, {
        subscriptionStatus: event === "subscription_cancelled" ? "cancelled" : "expired",
      });
      break;
    }
    case "subscription_payment_failed": {
      await applyTossShopSubscription(account.id, {
        lsCustomerId:
          attrs?.customer_id != null ? String(attrs.customer_id) : account.lsCustomerId,
        lsSubscriptionId: subscriptionId ?? account.lsSubscriptionId,
        subscriptionStatus: "past_due",
        proExpiresAt: parseRenewsAt(attrs) ?? account.proExpiresAt,
      });
      break;
    }
    case "order_created": {
      if (attrs?.status !== "paid" || attrs?.refunded) break;
      await upgradeAccountToPro(account.id, 1);
      break;
    }
    default:
      break;
  }

  return true;
}
