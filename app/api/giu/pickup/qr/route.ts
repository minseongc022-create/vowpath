import { NextResponse } from "next/server";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { createPickupQrToken } from "@/giu/lib/pickup-qr";
import { getReservation } from "@/giu/lib/store";

export async function GET(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservationId")?.trim();
    if (!reservationId) {
      return NextResponse.json({ error: "주문 ID가 필요합니다" }, { status: 400 });
    }

    const reservation = await getReservation(reservationId);
    if (!reservation || reservation.customerId !== session.sub) {
      return NextResponse.json({ error: "주문을 찾을 수 없습니다" }, { status: 404 });
    }
    if (reservation.paymentStatus !== "paid" || reservation.status !== "giu_cho") {
      return NextResponse.json({ error: "픽업 QR을 표시할 수 없습니다" }, { status: 400 });
    }

    const { token, expiresAt } = createPickupQrToken(reservationId);
    return NextResponse.json({ token, expiresAt });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
