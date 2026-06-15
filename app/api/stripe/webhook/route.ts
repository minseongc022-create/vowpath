import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/constants";
import { stripeClient } from "@/lib/billing";
import {
  findUserByEmail,
  findUserByStripeCustomerId,
  updateUserBilling,
} from "@/lib/users-db";

export const runtime = "nodejs";

function planFromMetadata(meta?: Stripe.Metadata | null): PlanId {
  return meta?.plan === "flex" ? "flex" : "unlimited";
}

async function syncSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  let user = await findUserByStripeCustomerId(customerId);
  if (!user && subscription.metadata?.email) {
    user = await findUserByEmail(subscription.metadata.email);
  }

  if (!user) {
    console.warn("[stripe/webhook] no user for customer", customerId);
    return;
  }

  const status = subscription.status as
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "incomplete";

  await updateUserBilling(user.id, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    plan: planFromMetadata(subscription.metadata),
  });
}

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    console.error("[stripe/webhook] signature", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email ??
          session.customer_email ??
          session.metadata?.email;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (email) {
          const user = await findUserByEmail(email);
          if (user) {
            await updateUserBilling(user.id, {
              plan: planFromMetadata(session.metadata),
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: "active",
              paidAt: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (customerId) {
          const user = await findUserByStripeCustomerId(customerId);
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
    console.error("[stripe/webhook] handler", event.type, e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
