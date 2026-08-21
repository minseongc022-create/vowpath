import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { requireFullAccess } from "@/toss-shop/lib/billing-access";
import {
  filterDiscoveryKeywords,
  getCategoryTabs,
  getDiscoveryKeywords,
  getTrendingKeywords,
} from "@/toss-shop/lib/discovery";
import { mergeDiscoveryWithMarket } from "@/toss-shop/lib/market-collector";
import { getMarketKeywords, getRankings } from "@/toss-shop/lib/store";
import type { TossShopCategory } from "@/toss-shop/lib/types";

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireFullAccess(session.sub);
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") ?? undefined) as TossShopCategory | undefined;
  const minSearch = searchParams.get("minSearch");
  const maxCompetition = searchParams.get("maxCompetition");
  const sort = searchParams.get("sort") as "search" | "competition" | "trend" | null;

  let keywords = getDiscoveryKeywords(category);
  const market = await getMarketKeywords();
  keywords = mergeDiscoveryWithMarket(keywords, market.marketKeywords);
  keywords = filterDiscoveryKeywords(keywords, {
    minSearch: minSearch ? Number(minSearch) : undefined,
    maxCompetition: maxCompetition ? Number(maxCompetition) : undefined,
    sort: sort ?? "search",
  });

  const [trendingKeywords, trendingProducts] = await Promise.all([
    Promise.resolve(getTrendingKeywords(10)),
    getRankings(category).then((products) =>
      products.slice(0, 10).map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        priceKrw: p.priceKrw,
        reviewCount: p.reviewCount,
        sellerName: p.sellerName,
      })),
    ),
  ]);

  return NextResponse.json({
    keywords,
    categories: getCategoryTabs(),
    trendingKeywords,
    trendingProducts,
    marketCollectedAt: market.marketCollectedAt,
    marketProductCount: market.marketProductCount,
  });
}
