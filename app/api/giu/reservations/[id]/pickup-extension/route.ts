import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest, requireMerchantSession } from "@/giu/lib/auth-request";
import {
  approvePickupExtension,
  approvePickupProposalByCustomer,
  getReservation,
  proposePickupChangeByMerchant,
  rejectPickupExtension,
  rejectPickupProposalByCustomer,
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
    merchantStorageConfirmed: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    note: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("propose"),
    plannedPickupAt: z.string().min(8),
    reason: z.string().max(300).optional(),
    merchantStorageConfirmed: z.boolean(),
  }),
  z.object({ action: z.literal("approve_proposal") }),
  z.object({ action: z.literal("reject_proposal") }),
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
      return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않습니다" }, { status: 400 });
    }

    const data = parsed.data;

    if (data.action === "request") {
      if (session.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 요청할 수 있어요" }, { status: 401 });
      }
      const result = await requestPickupExtension(id, session.sub, {
        reason: data.reason,
        plannedPickupAt: data.plannedPickupAt,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    if (data.action === "approve_proposal") {
      if (session.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 승인할 수 있어요" }, { status: 401 });
      }
      const result = await approvePickupProposalByCustomer(id, session.sub);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    if (data.action === "reject_proposal") {
      if (session.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 거절할 수 있어요" }, { status: 401 });
      }
      const result = await rejectPickupProposalByCustomer(id, session.sub);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    const auth = await requireMerchantSession(request);
    if (!auth || auth.merchantId !== reservation.merchantId) {
      return NextResponse.json({ error: "가게만 처리할 수 있어요" }, { status: 401 });
    }

    if (data.action === "propose") {
      const result = await proposePickupChangeByMerchant(auth.merchantId, id, {
        plannedPickupAt: data.plannedPickupAt,
        reason: data.reason,
        merchantStorageConfirmed: data.merchantStorageConfirmed,
      });
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    if (data.action === "approve") {
      const result = await approvePickupExtension(
        auth.merchantId,
        id,
        data.note,
        data.merchantStorageConfirmed,
      );
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    if (data.action === "reject") {
      const result = await rejectPickupExtension(auth.merchantId, id, data.note);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ reservation: result });
    }

    return NextResponse.json({ error: "지원하지 않는 요청이에요" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
