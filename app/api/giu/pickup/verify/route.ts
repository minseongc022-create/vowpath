import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { isPickupQrToken } from "@/giu/lib/pickup-qr";
import { confirmPickupByToken } from "@/giu/lib/store";

const schema = z.object({
  token: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "QR 형식이 올바르지 않습니다" }, { status: 400 });
    }
    const token = parsed.data.token.trim();
    if (!isPickupQrToken(token)) {
      return NextResponse.json({ error: "QR만 스캔할 수 있어요" }, { status: 400 });
    }
    const result = await confirmPickupByToken(session.merchantId, token);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ reservation: result });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
