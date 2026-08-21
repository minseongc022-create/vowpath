import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getImportPicksForMerchant } from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const picks = await getImportPicksForMerchant(session.merchantId);
  return NextResponse.json({
    picks,
    mode: "import",
    description: "오늘의 수입판매 추천 — 랜딩비·관세 반영 수익 분석",
  });
}
