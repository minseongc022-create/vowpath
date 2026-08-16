import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import { confirmTossPayment, mapTossPaymentMethod } from "@/giu/lib/toss-payments";
import { confirmReservationPayment, getReservation } from "@/giu/lib/store";

/** Toss successUrl — confirm payment then redirect to pickup ticket. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentKey = url.searchParams.get("paymentKey")?.trim();
  const orderId = url.searchParams.get("orderId")?.trim();
  const amountRaw = url.searchParams.get("amount")?.trim();
  const origin = getGiuPublicOrigin();

  if (!paymentKey || !orderId || !amountRaw) {
    return NextResponse.redirect(`${origin}/hop?pay=invalid`);
  }

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.redirect(`${origin}/hop?pay=invalid`);
  }

  const reservation = await getReservation(orderId);
  if (!reservation) {
    return NextResponse.redirect(`${origin}/hop?pay=error`);
  }

  if (reservation.paymentStatus === "paid") {
    return NextResponse.redirect(`${origin}/dat/${orderId}?paid=1`);
  }

  if (reservation.totalVnd !== amount) {
    console.error("[giu/toss] amount mismatch", {
      orderId,
      expected: reservation.totalVnd,
      got: amount,
    });
    return NextResponse.redirect(`${origin}/dat/${orderId}?pay=amount_mismatch`);
  }

  const result = await confirmTossPayment({ paymentKey, orderId, amount });
  if (!result.ok) {
    return NextResponse.redirect(
      `${origin}/dat/${orderId}?pay=failed&msg=${encodeURIComponent(result.error)}`,
    );
  }

  const paymentMethod = mapTossPaymentMethod(result.payment);
  const confirmed = await confirmReservationPayment(orderId, paymentKey, paymentMethod);
  if (!confirmed) {
    return NextResponse.redirect(`${origin}/dat/${orderId}?pay=error`);
  }

  return NextResponse.redirect(`${origin}/dat/${orderId}?paid=1`);
}
