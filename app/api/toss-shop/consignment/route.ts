import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getConsignmentPicksForMerchant, getMarketKeywords, getStoreCatalog } from "@/toss-shop/lib/store";
import { CONSIGNMENT_DAILY_PICKS } from "@/toss-shop/lib/billing";
import { marketContext } from "@/toss-shop/lib/seller-engine/intelligence";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [picks, market, catalog] = await Promise.all([
    getConsignmentPicksForMerchant(session.merchantId),
    getMarketKeywords(),
    getStoreCatalog(),
  ]);
  const ctx = marketContext(catalog, market.marketKeywords);

  return NextResponse.json({
    picks,
    dailyLimit: CONSIGNMENT_DAILY_PICKS,
    mode: "consignment",
    description: "AI 위탁 소싱 — 다층 시장 분석 · 경쟁가 자동 매칭 · 하루 5개",
    catalogSize: ctx.catalogSize,
    marketKeywordCount: ctx.marketKeywordCount,
    marketCollectedAt: market.marketCollectedAt,
    dataQuality: ctx.dataQuality,
  });
}
