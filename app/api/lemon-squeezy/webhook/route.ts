import crypto from "crypto";
import { NextResponse } from "next/server";
import type { PlanId } from "@/lib/constants";
import { normalizePlanId } from "@/lib/plan-pricing";
import { mapLsStatus } from "@/lib/billing";
import {
  planFromVariantId,
  usageVariantIdsForPlan,
} from "@/lib/lemon-squeezy-config";
import { listSubscriptionItems } from "@/lib/lemon-squeezy-client";
import {
  findUserByEmail,
  findUserByLsCustomerId,
  updateUserBilling,
} from "@/lib/users-db";
import { handleTossShopLsWebhook } from "@/toss-shop/lib/lemon-squeezy-webhook";
import type { TossShopLsWebhook } from "@/toss-shop/lib/lemon-squeezy";

export const runtime = "nodejs";

function verifyLsSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
  const signature = Buffer.from(header, "utf8");
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(digest, signature);
}

type LsWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown> | null;
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
};

function planFromPayload(payload: LsWebhookPayload): PlanId {
  const customPlan = payload.meta?.custom_data?.plan;
  if (typeof customPlan === "string") {
    return normalizePlanId(customPlan);
  }
  const variantId = payload.data?.attributes?.variant_id;
  if (variantId != null) {
    return planFromVariantId(String(variantId)) ?? normalizePlanId(undefined);
  }
  return normalizePlanId(undefined);
}

async function resolveUsageItemId(
  subscriptionId: string,
  plan: PlanId,
): Promise<string | undefined> {
  const items = await listSubscriptionItems(subscriptionId);
  if (items.length === 0) return undefined;

  const usageVariants = new Set(usageVariantIdsForPlan(plan));
  for (const item of items) {
    const variantId = item.variant_id != null ? String(item.variant_id) : "";
    if (usageVariants.has(variantId)) {
      return String(item.id);
    }
  }

  return items.length > 1 ? String(items[items.length - 1].id) : undefined;
}

async function syncSubscription(payload: LsWebhookPayload): Promise<void> {
  const attrs = payload.data?.attributes;
  const subscriptionId = payload.data?.id;
  if (!attrs || !subscriptionId) return;

  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : undefined;
  const email =
    typeof attrs.user_email === "string"
      ? attrs.user_email
      : typeof attrs.customer_email === "string"
        ? attrs.customer_email
        : undefined;

  let user = customerId ? await findUserByLsCustomerId(customerId) : undefined;
  if (!user && email) {
    user = await findUserByEmail(email);
  }
  if (!user) {
    console.warn("[lemon-squeezy/webhook] no user for subscription", subscriptionId);
    return;
  }

  const plan = planFromPayload(payload);
  const status = mapLsStatus(String(attrs.status ?? "past_due"));
  const usageItemId = await resolveUsageItemId(subscriptionId, plan);

  await updateUserBilling(user.id, {
    plan,
    lsCustomerId: customerId,
    lsSubscriptionId: subscriptionId,
    lsUsageItemId: usageItemId,
    subscriptionStatus: status,
    ...(status === "active" ? { paidAt: new Date().toISOString() } : {}),
  });
}

export async function POST(request: Request) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get("X-Signature");
  if (!verifyLsSignature(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";

  try {
    const tossHandled = await handleTossShopLsWebhook(payload as TossShopLsWebhook);
    if (tossHandled) {
      return NextResponse.json({ received: true });
    }

    switch (event) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed":
        await syncSubscription(payload);
        break;
      case "subscription_cancelled":
      case "subscription_expired": {
        const customerId =
          payload.data?.attributes?.customer_id != null
            ? String(payload.data.attributes.customer_id)
            : undefined;
        if (customerId) {
          const user = await findUserByLsCustomerId(customerId);
          if (user) {
            await updateUserBilling(user.id, { subscriptionStatus: "canceled" });
          }
        }
        break;
      }
      case "subscription_payment_failed": {
        const customerId =
          payload.data?.attributes?.customer_id != null
            ? String(payload.data.attributes.customer_id)
            : undefined;
        if (customerId) {
          const user = await findUserByLsCustomerId(customerId);
          if (user) {
            await updateUserBilling(user.id, { subscriptionStatus: "past_due" });
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[lemon-squeezy/webhook] handler", event, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
