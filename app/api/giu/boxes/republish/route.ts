import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getMerchantByAccountId, republishBox, republishLastBox } from "@/giu/lib/store";

const bodySchema = z.object({
  boxId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "가게 로그인이 필요합니다" }, { status: 401 });
    }
    const merchant = await getMerchantByAccountId(session.sub);
    const merchantId = merchant?.id ?? session.merchantId;

    let boxId: string | undefined;
    try {
      const body = await request.json();
      const parsed = bodySchema.safeParse(body);
      if (parsed.success) boxId = parsed.data.boxId;
    } catch {
      /* empty body — republish last */
    }

    const result = boxId
      ? await republishBox(merchantId, boxId)
      : await republishLastBox(merchantId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ box: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
