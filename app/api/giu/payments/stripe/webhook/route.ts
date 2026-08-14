import { NextResponse } from "next/server";
import {
  reservationIdFromStripeSession,
  stripePaymentId,
  verifyStripeWebhook,
} from "@/giu/lib/stripe";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

/** Stripe webhook — backup confirmation if customer closes browser before return URL. */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verified = verifyStripeWebhook(payload, signature);

  if (!verified.valid || !verified.event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = verified.event;
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const reservationId = reservationIdFromStripeSession(session);
  if (!reservationId) {
    return NextResponse.json({ error: "Missing reservation id" }, { status: 400 });
  }

  const reservation = await getReservation(reservationId);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.paymentStatus === "paid") {
    return NextResponse.json({ received: true });
  }

  const confirmed = await confirmReservationPayment(
    reservationId,
    stripePaymentId(session),
  );

  if (!confirmed) {
    return NextResponse.json({ error: "Confirm failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
