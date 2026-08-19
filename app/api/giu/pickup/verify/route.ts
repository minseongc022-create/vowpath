import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMerchantSession } from "@/giu/lib/auth-request";
import { isPickupQrToken } from "@/giu/lib/pickup-qr";
import { confirmPickupByCode, confirmPickupById, confirmPickupByToken, getBox } from "@/giu/lib/store";

const schema = z
  .object({
    token: z.string().min(8).max(200).optional(),
    code: z.string().regex(/^\d{3}$|^[A-F0-9]{6}$/i).optional(),
    reservationId: z.string().min(4).max(80).optional(),
  })
  .refine((d) => Boolean(d.token?.trim() || d.code?.trim() || d.reservationId?.trim()), {
    message: "QR 또는 주문 코드를 입력해 주세요",
  });

export async function POST(request: Request) {
  try {
    const auth = await requireMerchantSession(request);
    if (!auth) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" },
        { status: 400 },
      );
    }

    const token = parsed.data.token?.trim();
    const code = parsed.data.code?.trim();
    const reservationId = parsed.data.reservationId?.trim();
    let result;
    if (reservationId) {
      result = await confirmPickupById(auth.merchantId, reservationId);
    } else if (code) {
      result = await confirmPickupByCode(auth.merchantId, code);
    } else {
      if (!token || !isPickupQrToken(token)) {
        return NextResponse.json({ error: "QR만 스캔할 수 있어요" }, { status: 400 });
      }
      result = await confirmPickupByToken(auth.merchantId, token);
    }

    if ("error" in result) {
      const status = result.error.includes("만료") ? 410 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }

    const box = await getBox(result.boxId);
    const net = result.totalVnd - result.platformFeeVnd;
    return NextResponse.json({
      reservation: result,
      boxTitle: box?.title ?? "",
      netPayoutVnd: net,
    });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
