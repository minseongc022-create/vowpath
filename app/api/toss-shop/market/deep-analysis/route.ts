import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { getAccountAccess, keywordLimitResponse } from "@/toss-shop/lib/billing-access";
import { FREE_DAILY_KEYWORD_LIMIT } from "@/toss-shop/lib/billing";
import { runTossDeepAnalysis } from "@/toss-shop/lib/seller-engine/toss-market-engine";
import {
  analyzeKeywordForMerchant,
  getKeywordHistory,
  getMarketKeywords,
  getStoreCatalog,
  recordKeywordAnalysis,
} from "@/toss-shop/lib/store";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  const { account, access } = await getAccountAccess(session.sub);
  if (!account || !access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!access.fullAccess) {
    const used = account.usage?.keywordAnalyses ?? 0;
    if (used >= FREE_DAILY_KEYWORD_LIMIT) {
      return keywordLimitResponse(used, FREE_DAILY_KEYWORD_LIMIT);
    }
    await recordKeywordAnalysis(session.sub);
  }

  const [catalog, market] = await Promise.all([getStoreCatalog(), getMarketKeywords()]);
  const tracked = await analyzeKeywordForMerchant(session.merchantId, keyword);
  const deep = await runTossDeepAnalysis({
    keyword,
    catalog,
    marketKeywords: market.marketKeywords,
  });
  const history = await getKeywordHistory(keyword);

  return NextResponse.json({
    deep,
    basic: tracked,
    history,
  });
}
