import crypto from "crypto";
import { NextResponse } from "next/server";
import type { PlanId } from "@/lib/constants";
import { paddleFetch } from "@/lib/paddle-client";
import type { SubscriptionStatus } from "@/lib/billing";
import {
  findUserByEmail,
  findUserByPaddleCustomerId,
  updateUserBilling,
} from "@/lib/users-db";

export const runtime = "nodejs";

/** 5 min tolerance — Paddle's own SDKs default to 5s, but we allow more slack for lag. */
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(";").map((kv) => kv.split("=") as [string, string]),
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(ageSeconds) || ageSeconds > MAX_SIGNATURE_AGE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(h1, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function planFromCustomData(customData: Record<string, unknown> | null | undefined): PlanId {
  return customData?.plan === "flex" ? "flex" : "unlimited";
}

function mapStatus(paddleStatus: string): SubscriptionStatus {
  switch (paddleStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "paused":
    case "canceled":
      return paddleStatus;
    default:
      return "past_due";
  }
}

type PaddleTransactionEvent = {
  customer_id?: string;
  subscription_id?: string;
  custom_data?: Record<string, unknown> | null;
  customer?: { email?: string } | null;
};

type PaddleSubscriptionEvent = {
  id: string;
  customer_id: string;
  status: string;
  custom_data?: Record<string, unknown> | null;
};

async function resolveTransactionEmail(tx: PaddleTransactionEvent): Promise<string | undefined> {
  if (tx.customer?.email) return tx.customer.email;
  if (!tx.customer_id) return undefined;
  try {
    const customer = await paddleFetch<{ data: { email?: string } }>(
      `/customers/${tx.customer_id}`,
    );
    return customer.data?.email;
  } catch (e) {
    console.warn("[paddle/webhook] customer lookup", e);
    return undefined;
  }
}

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get("paddle-signature");
  if (!verifyPaddleSignature(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    switch (event.event_type) {
      case "transaction.completed": {
        const tx = event.data as PaddleTransactionEvent;
        const email = await resolveTransactionEmail(tx);
        if (email) {
          const user = await findUserByEmail(email);
          if (user) {
            await updateUserBilling(user.id, {
              plan: planFromCustomData(tx.custom_data),
              paddleCustomerId: tx.customer_id,
              paddleSubscriptionId: tx.subscription_id,
              subscriptionStatus: "active",
              paidAt: new Date().toISOString(),
            });
          } else {
            console.warn("[paddle/webhook] no user for email", email);
          }
        }
        break;
      }
      case "subscription.created":
      case "subscription.updated": {
        const sub = event.data as PaddleSubscriptionEvent;
        const user = await findUserByPaddleCustomerId(sub.customer_id);
        if (!user) {
          console.warn("[paddle/webhook] no user for customer", sub.customer_id);
          break;
        }
        await updateUserBilling(user.id, {
          paddleCustomerId: sub.customer_id,
          paddleSubscriptionId: sub.id,
          subscriptionStatus: mapStatus(sub.status),
          plan: planFromCustomData(sub.custom_data),
        });
        break;
      }
      case "subscription.canceled": {
        const sub = event.data as { customer_id: string };
        const user = await findUserByPaddleCustomerId(sub.customer_id);
        if (user) {
          await updateUserBilling(user.id, { subscriptionStatus: "canceled" });
        }
        break;
      }
      case "transaction.payment_failed": {
        const tx = event.data as { customer_id?: string };
        if (tx.customer_id) {
          const user = await findUserByPaddleCustomerId(tx.customer_id);
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
    console.error("[paddle/webhook] handler", event.event_type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
