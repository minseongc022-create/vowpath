import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest, requireMerchantSession } from "@/giu/lib/auth-request";
import {
  approvePickupExtension,
  getReservation,
  markMerchantNoShow,
  rejectPickupExtension,
  requestPickupExtension,
} from "@/giu/lib/store";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("request"),
    reason: z.string().min(4).max(300),
    plannedPickupAt: z.string().min(8),
  }),
  z.object({
    action: z.literal("approve"),
    note: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    note: z.string().max(200).optional(),
  }),
  z.object({ action: z.literal("mark-no-show") }),
]);

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
      const result = await requestPickupExtension(id, session.sub, {
        reason: parsed.data.reason,
        plannedPickupAt: parsed.data.plannedPickupAt,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    const auth = await requireMerchantSession(request);
    if (!auth || auth.merchantId !== reservation.merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (parsed.data.action === "approve") {
      const result = await approvePickupExtension(auth.merchantId, id, parsed.data.note);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    if (parsed.data.action === "reject") {
      const result = await rejectPickupExtension(auth.merchantId, id, parsed.data.note);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    const result = await markMerchantNoShow(auth.merchantId, id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ reservation: result });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
