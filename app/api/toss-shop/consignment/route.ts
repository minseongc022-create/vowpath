import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getConsignmentPicksForMerchant } from "@/toss-shop/lib/store";
import { CONSIGNMENT_DAILY_PICKS } from "@/toss-shop/lib/billing";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const picks = await getConsignmentPicksForMerchant(session.merchantId);
  return NextResponse.json({
    picks,
    dailyLimit: CONSIGNMENT_DAILY_PICKS,
    mode: "consignment",
    description: "오늘의 위탁판매 추천 — 경쟁가 자동 매칭 · 하루 5개",
  });
}
