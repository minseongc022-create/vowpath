import { NextResponse } from "next/server";
import {
  verifyTossShopLsWebhookSignature,
  type TossShopLsWebhook,
} from "@/toss-shop/lib/lemon-squeezy";
import { handleTossShopLsWebhook } from "@/toss-shop/lib/lemon-squeezy-webhook";

export const runtime = "nodejs";

/** Lemon Squeezy webhook for Effiroad toss-shop Pro subscriptions. */
export async function POST(request: Request) {
  const secret = process.env.TOSS_SHOP_LEMON_SQUEEZY_WEBHOOK_SECRET?.trim()
    ?? process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get("X-Signature");
  if (!verifyTossShopLsWebhookSignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: TossShopLsWebhook;
  try {
    payload = JSON.parse(rawBody) as TossShopLsWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await handleTossShopLsWebhook(payload);
  } catch (e) {
    console.error("[toss-shop/ls/webhook]", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
