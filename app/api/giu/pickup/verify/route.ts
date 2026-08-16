import { NextResponse } from "next/server";
import { z } from "zod";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { confirmPickupByCode } from "@/giu/lib/store";

const schema = z.object({
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "코드 형식이 올바르지 않습니다" }, { status: 400 });
    }
    const result = await confirmPickupByCode(session.merchantId, parsed.data.code);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ reservation: result });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
