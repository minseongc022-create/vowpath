import { NextResponse } from "next/server";
import { getGiuSessionFromRequest } from "@/giu/lib/auth-request";
import { getMerchantByAccountId, republishLastBox } from "@/giu/lib/store";

export async function POST(request: Request) {
  try {
    const session = await getGiuSessionFromRequest(request);
    if (!session || session.role !== "merchant" || !session.merchantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const merchant = await getMerchantByAccountId(session.sub);
    const merchantId = merchant?.id ?? session.merchantId;
    const result = await republishLastBox(merchantId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ box: result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
