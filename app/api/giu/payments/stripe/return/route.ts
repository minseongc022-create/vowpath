import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import {
  reservationIdFromStripeSession,
  retrieveStripeCheckoutSession,
  stripePaymentId,
} from "@/giu/lib/stripe";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

/** Stripe Checkout return — confirm reservation then redirect to pickup code. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  const origin = getGiuPublicOrigin();

  if (!sessionId) {
    return NextResponse.redirect(`${origin}/hop?pay=invalid`);
  }

  try {
    const session = await retrieveStripeCheckoutSession(sessionId);
    const reservationId = reservationIdFromStripeSession(session);
    if (!reservationId || session.payment_status !== "paid") {
      return NextResponse.redirect(`${origin}/hop?pay=failed`);
    }

    const reservation = await getReservation(reservationId);
    if (!reservation) {
      return NextResponse.redirect(`${origin}/hop?pay=error`);
    }

    if (reservation.paymentStatus !== "paid") {
      const confirmed = await confirmReservationPayment(
        reservationId,
        stripePaymentId(session),
      );
      if (!confirmed) {
        return NextResponse.redirect(`${origin}/hop?pay=error`);
      }
    }

    return NextResponse.redirect(`${origin}/dat/${reservationId}?paid=1`);
  } catch (e) {
    console.error("[giu/stripe/return] failed", e);
    return NextResponse.redirect(`${origin}/hop?pay=error`);
  }
}
