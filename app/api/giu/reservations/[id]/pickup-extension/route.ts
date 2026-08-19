import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getReservation, grantPickupExtension, requestPickupExtension } from "@/giu/lib/store";

const bodySchema = z.object({
  action: z.enum(["request", "grant"]),
});

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    if (!reservation) {
      return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    }

    const session = await getGiuSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
    }

    if (parsed.data.action === "request") {
      if (session.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = await requestPickupExtension(id, session.sub);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    if (session.role !== "merchant" || session.merchantId !== reservation.merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await grantPickupExtension(session.merchantId, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ reservation: result });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
