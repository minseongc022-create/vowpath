import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest, merchantOwnsReservation, resolveMerchantId } from "@/giu/lib/auth-request";
import {
  cancelReservation,
  getOrderStatusLogs,
  getReservation,
  merchantConfirmOrder,
  reportOrderDispute,
  reportProductIssue,
  requestStructuredRefund,
} from "@/giu/lib/store";

const postSchema = z.object({
  action: z.enum(["confirm", "report_dispute", "cancel", "request_refund", "report_product"]),
  reason: z.string().max(300).optional(),
  detail: z.string().max(500).optional(),
  problemType: z.string().max(100).optional(),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
  kind: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  storageNote: z.string().max(300).optional(),
});

type Props = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);
  if (!reservation) {
    return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
  }

  const session = await getGiuSessionFromRequest(request);
  const merchantOk =
    session?.role === "merchant" && (await merchantOwnsReservation(session, reservation.merchantId));
  const allowed =
    (session?.role === "customer" && session.sub === reservation.customerId) || merchantOk;

  if (!allowed) {
    return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });
  }

  const logs = await getOrderStatusLogs(id);
  return NextResponse.json({ logs });
}

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const reservation = await getReservation(id);
    if (!reservation) {
      return NextResponse.json({ error: "찾을 수 없습니다" }, { status: 404 });
    }

    const session = await getGiuSessionFromRequest(request);
    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "요청 형식이 올바르지 않아요" }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    if (action === "confirm") {
      if (session?.role !== "merchant") {
        return NextResponse.json({ error: "가게 계정만 확인할 수 있어요" }, { status: 401 });
      }
      if (!(await merchantOwnsReservation(session, reservation.merchantId))) {
        return NextResponse.json({ error: "권한이 없어요" }, { status: 403 });
      }
      const merchantId = await resolveMerchantId(session);
      if (!merchantId) {
        return NextResponse.json({ error: "가게 정보를 찾을 수 없어요" }, { status: 403 });
      }
      const result = await merchantConfirmOrder(merchantId, id);
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    if (action === "report_dispute") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 신고할 수 있어요" }, { status: 401 });
      }
      const result = await reportOrderDispute(id, session.sub, reason ?? "");
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    if (action === "cancel") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 취소할 수 있어요" }, { status: 401 });
      }
      const updated = await cancelReservation(id, session.sub);
      if (!updated) {
        return NextResponse.json({ error: "환불할 수 없는 주문이에요" }, { status: 400 });
      }
      return NextResponse.json({ reservation: updated });
    }

    if (action === "request_refund") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 요청할 수 있어요" }, { status: 401 });
      }
      const result = await requestStructuredRefund(id, session.sub, {
        reason: reason ?? "",
        detail: parsed.data.detail,
        problemType: parsed.data.problemType,
        evidenceUrls: parsed.data.evidenceUrls,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    if (action === "report_product") {
      if (session?.role !== "customer" || session.sub !== reservation.customerId) {
        return NextResponse.json({ error: "고객만 신고할 수 있어요" }, { status: 401 });
      }
      const result = await reportProductIssue(id, session.sub, {
        kind: parsed.data.kind ?? reason ?? "기타",
        description: parsed.data.description ?? parsed.data.detail,
        evidenceUrls: parsed.data.evidenceUrls,
        storageNote: parsed.data.storageNote,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ reservation: result });
    }

    return NextResponse.json({ error: "알 수 없는 요청이에요" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
