import { NextResponse } from "next/server";
import { z } from "zod";
import { createReservation, listReservations } from "@/giu/lib/store";

const createSchema = z.object({
  boxId: z.string().min(1),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(8).max(20),
  quantity: z.number().int().min(1).max(5).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone") ?? undefined;
  const merchantId = url.searchParams.get("merchantId") ?? undefined;
  const boxId = url.searchParams.get("boxId") ?? undefined;
  const reservations = await listReservations({ phone, merchantId, boxId });
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }
    const result = await createReservation(parsed.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(
      { id: result.reservation.id, reservation: result.reservation },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
