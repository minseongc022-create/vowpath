import type { WholesaleListing, WholesaleSearchResult } from "./types";
import { isDomeggookApiConfigured, searchAllKoreanWholesale } from "./domeggook-api";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function estimateListings(keyword: string, tossAvgPriceKrw: number): WholesaleListing[] {
  const h = hashString(keyword);
  const base = Math.round(tossAvgPriceKrw * (0.38 + (h % 12) / 100));
  const platforms: WholesaleListing["platform"][] = ["domeggook", "domeme"];

  return platforms.map((platform, i) => {
    const price = base + i * (200 + (h % 500));
    const itemNo = 7_000_000 + (h % 900_000) + i;
    const url =
      platform === "domeggook"
        ? `https://www.domeggook.com/main/item/itemList.php?sword=${encodeURIComponent(keyword)}`
        : `https://domemedb.domeggook.com/index/item/supplyList.php?keyword=${encodeURIComponent(keyword)}`;

    return {
      platform,
      itemNo,
      title: `${keyword} 위탁 공급 (${platform === "domeggook" ? "도매꾹" : "도매매"})`,
      unitPriceKrw: price,
      shippingFeeKrw: platform === "domeme" ? 2500 : 0,
      moq: 1,
      url,
      freeShipping: platform === "domeggook",
      source: "estimated" as const,
    };
  });
}

export function landedWholesaleUnitCost(listing: WholesaleListing): number {
  return listing.unitPriceKrw + (listing.freeShipping ? 0 : listing.shippingFeeKrw);
}

export function attachMarginVsToss(listings: WholesaleListing[], tossRetailKrw: number): WholesaleListing[] {
  return listings.map((l) => {
    const cost = landedWholesaleUnitCost(l);
    const margin = tossRetailKrw > 0 ? Math.round(((tossRetailKrw - cost) / tossRetailKrw) * 1000) / 10 : 0;
    return { ...l, marginVsTossPct: margin };
  });
}

export function pickBestWholesaleMatch(
  listings: WholesaleListing[],
  tossRetailKrw: number,
  minMarginPct = 12,
): WholesaleListing | null {
  const scored = attachMarginVsToss(listings, tossRetailKrw)
    .filter((l) => (l.marginVsTossPct ?? 0) >= minMarginPct)
    .sort((a, b) => landedWholesaleUnitCost(a) - landedWholesaleUnitCost(b));
  return scored[0] ?? listings.sort((a, b) => a.unitPriceKrw - b.unitPriceKrw)[0] ?? null;
}

export async function searchWholesaleForConsignment(input: {
  keyword: string;
  tossAvgPriceKrw: number;
  targetRetailKrw?: number;
}): Promise<WholesaleSearchResult> {
  const target = input.targetRetailKrw ?? input.tossAvgPriceKrw;
  const apiConfigured = isDomeggookApiConfigured();
  let listings = apiConfigured ? await searchAllKoreanWholesale(input.keyword, 6) : [];

  if (!listings.length) {
    listings = estimateListings(input.keyword, input.tossAvgPriceKrw);
  }

  listings = attachMarginVsToss(listings, target);
  const bestMatch = pickBestWholesaleMatch(listings, target, 10);

  return {
    keyword: input.keyword,
    listings: listings.slice(0, 6),
    bestMatch,
    searchedAt: new Date().toISOString(),
    apiConfigured,
  };
}
