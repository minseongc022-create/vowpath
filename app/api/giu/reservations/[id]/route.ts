import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import {
  cancelReservation,
  getReservation,
  updateReservationStatus,
} from "@/giu/lib/store";
import type { GiuReservationStatus } from "@/giu/lib/types";

const patchSchema = z.object({
  status: z.enum(["giu_cho", "da_lay", "het_han", "huy"]),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  const session = await getGiuSessionFromRequest(request);
  const allowed =
    (session?.role === "customer" && session.sub === reservation.customerId) ||
    (session?.role === "merchant" && session.merchantId === reservation.merchantId);

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ reservation });
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    if (!reservation) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    const session = await getGiuSessionFromRequest(request);
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const status = parsed.data.status as GiuReservationStatus;
    let updated;

    if (status === "huy") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      updated = await cancelReservation(id);
    } else {
      if (session?.role !== "merchant" || session.merchantId !== reservation.merchantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      updated = await updateReservationStatus(id, status);
    }

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy hoặc không thể cập nhật" }, { status: 404 });
    }
    return NextResponse.json({ reservation: updated });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
