import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import {
  reservationIdFromLsWebhook,
  verifyGiuLsWebhookSignature,
  type GiuLsOrderWebhook,
} from "@/giu/lib/lemon-squeezy-giu";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

export const runtime = "nodejs";

/** Lemon Squeezy order_created — confirm Giu reservation after payment. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("X-Signature");

  if (!verifyGiuLsWebhookSignature(rawBody, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: GiuLsOrderWebhook;
  try {
    payload = JSON.parse(rawBody) as GiuLsOrderWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  if (event !== "order_created") {
    return NextResponse.json({ received: true });
  }

  const reservationId = reservationIdFromLsWebhook(payload);
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservationId" }, { status: 400 });
  }

  const attrs = payload.data?.attributes;
  if (!attrs || attrs.status !== "paid" || attrs.refunded) {
    return NextResponse.json({ received: true });
  }

  const reservation = await getReservation(reservationId);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (
    reservation.chargeAmountUsdCents != null &&
    attrs.total != null &&
    reservation.chargeAmountUsdCents !== attrs.total
  ) {
    console.error("[giu/ls/webhook] amount mismatch", {
      reservationId,
      expected: reservation.chargeAmountUsdCents,
      got: attrs.total,
    });
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  if (reservation.paymentStatus === "paid") {
    return NextResponse.json({ received: true });
  }

  const orderId = payload.data?.id ?? `ls_${Date.now()}`;
  const confirmed = await confirmReservationPayment(reservationId, `ls_${orderId}`);
  if (!confirmed) {
    return NextResponse.json({ error: "Confirm failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
