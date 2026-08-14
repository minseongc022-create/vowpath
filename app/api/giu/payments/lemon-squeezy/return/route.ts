import { NextResponse } from "next/server";
import { getGiuPublicOrigin } from "@/giu/lib/giu-host";
import { getReservation } from "@/giu/lib/store";

/** Lemon Squeezy checkout redirect — send customer to pickup code page. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reservationId = url.searchParams.get("reservation_id")?.trim();
  const origin = getGiuPublicOrigin();

  if (!reservationId) {
    return NextResponse.redirect(`${origin}/hop?pay=invalid`);
  }

  const reservation = await getReservation(reservationId);
  if (!reservation) {
    return NextResponse.redirect(`${origin}/hop?pay=error`);
  }

  if (reservation.paymentStatus === "paid") {
    return NextResponse.redirect(`${origin}/dat/${reservationId}?paid=1`);
  }

  return NextResponse.redirect(`${origin}/dat/${reservationId}?pay=pending`);
}
