import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { createPaidReservation, listReservations } from "@/giu/lib/store";

const createSchema = z.object({
  boxId: z.string().min(1),
  quantity: z.number().int().min(1).max(5).optional(),
  paymentMethod: z.enum(["momo", "vietqr", "card"]),
});

export async function GET(request: Request) {
  const session = await getGiuSessionFromRequest(request);
  const url = new URL(request.url);
  const merchantId = url.searchParams.get("merchantId") ?? undefined;
  const boxId = url.searchParams.get("boxId") ?? undefined;
  const phone = url.searchParams.get("phone") ?? undefined;

  if (merchantId) {
    if (!session || session.role !== "merchant" || session.merchantId !== merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (phone) {
    if (!session || session.phone.replace(/\s/g, "") !== phone.replace(/\s/g, "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (session?.role === "customer") {
    const reservations = await listReservations({ customerId: session.sub });
    return NextResponse.json({ reservations });
  } else if (session?.role === "merchant" && session.merchantId) {
    const reservations = await listReservations({ merchantId: session.merchantId });
    return NextResponse.json({ reservations });
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reservations = await listReservations({ phone, merchantId, boxId });
  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "customer") {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập để giải cứu và thanh toán" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
        { status: 400 },
      );
    }

    const result = await createPaidReservation({
      boxId: parsed.data.boxId,
      customerId: session.sub,
      customerName: session.name,
      customerPhone: session.phone,
      paymentMethod: parsed.data.paymentMethod,
      quantity: parsed.data.quantity,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        id: result.reservation.id,
        code: result.reservation.code,
        reservation: result.reservation,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}
