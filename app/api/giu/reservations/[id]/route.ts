import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  return NextResponse.json({ reservation });
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }
    const status = parsed.data.status as GiuReservationStatus;
    let reservation;
    if (status === "huy") {
      reservation = await cancelReservation(id);
    } else {
      reservation = await updateReservationStatus(id, status);
    }
    if (!reservation) {
      return NextResponse.json({ error: "Không tìm thấy hoặc không thể cập nhật" }, { status: 404 });
    }
    return NextResponse.json({ reservation });
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
