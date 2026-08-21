import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import { getImportPicksForMerchant, getMarketKeywords, getStoreCatalog } from "@/toss-shop/lib/store";
import { marketContext } from "@/toss-shop/lib/seller-engine/intelligence";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const [picks, market, catalog] = await Promise.all([
    getImportPicksForMerchant(session.merchantId),
    getMarketKeywords(),
    getStoreCatalog(),
  ]);
  const ctx = marketContext(catalog, market.marketKeywords);

  return NextResponse.json({
    picks,
    mode: "import",
    description: "AI 수입 소싱 — 랜딩비·관세·경쟁가·마진 다층 분석",
    catalogSize: ctx.catalogSize,
    marketKeywordCount: ctx.marketKeywordCount,
    dataQuality: ctx.dataQuality,
  });
}
