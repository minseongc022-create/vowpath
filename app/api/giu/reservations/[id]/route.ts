import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest, merchantOwnsReservation, requireMerchantSession } from "@/giu/lib/auth-request";
import {
  cancelReservation,
  getRefundPreview,
  getReservation,
  updateReservationStatus,
} from "@/giu/lib/store";
import { stripPickupCodeForMerchant } from "@/giu/lib/reservation-sanitize";
import type { GiuReservationStatus } from "@/giu/lib/types";

const patchSchema = z.object({
  status: z.enum(["giu_cho", "da_lay", "het_han", "huy"]),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const session = await getGiuSessionFromRequest(request);
  const merchantOk = session?.role === "merchant" && (await merchantOwnsReservation(session, reservation.merchantId));
  const allowed =
    (session?.role === "customer" && session.sub === reservation.customerId) || merchantOk;

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const wantsPreview = url.searchParams.get("refundPreview") === "1";
  if (wantsPreview) {
    if (session?.role !== "customer" || session.sub !== reservation.customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const refundPreview = await getRefundPreview(id);
    if (!refundPreview) {
      return NextResponse.json({ error: "환불할 수 없는 주문이에요" }, { status: 400 });
    }
    return NextResponse.json({ refundPreview });
  }

  const payload =
    session?.role === "merchant"
      ? { reservation: stripPickupCodeForMerchant(reservation) }
      : { reservation };

  return NextResponse.json(payload);
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    if (!reservation) {
      return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    }

    const session = await getGiuSessionFromRequest(request);
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "상태값이 올바르지 않습니다" }, { status: 400 });
    }

    const status = parsed.data.status as GiuReservationStatus;
    let updated;

    if (status === "huy") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      updated = await cancelReservation(id);
    } else {
      if (session?.role !== "merchant" || !(await merchantOwnsReservation(session, reservation.merchantId))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      updated = await updateReservationStatus(id, status);
    }

    if (!updated) {
      return NextResponse.json({ error: "찾을 수 없거나 업데이트할 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ reservation: updated });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
