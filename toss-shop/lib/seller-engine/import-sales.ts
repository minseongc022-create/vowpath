import { getDiscoveryKeywords } from "../discovery";
import type { CatalogProduct, ImportPick, TossShopCategory } from "../types";
import { autoMatchPrice, marginPct } from "./pricing";

const USD_KRW = 1380;
const IMPORT_CATEGORIES: TossShopCategory[] = ["digital", "home", "beauty", "fashion", "health"];

const SOURCE_COUNTRIES = ["중국", "베트남", "일본", "미국"] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function landedCostKrw(sourceUsd: number, weightKg = 0.5): number {
  const product = sourceUsd * USD_KRW;
  const shipping = Math.round(weightKg * 4500 + 3500);
  const duty = Math.round(product * 0.08);
  return Math.round(product + shipping + duty);
}

export function generateImportPicks(catalog: CatalogProduct[], dateKey: string): ImportPick[] {
  const keywords = getDiscoveryKeywords()
    .filter((k) => IMPORT_CATEGORIES.includes(k.category))
    .sort((a, b) => b.avgPriceKrw - a.avgPriceKrw)
    .slice(0, 20);

  const picks: ImportPick[] = [];

  for (let i = 0; i < 5 && i < keywords.length; i++) {
    const kw = keywords[i];
    const h = hashString(kw.keyword + dateKey);
    const product =
      catalog.find((p) => p.category === kw.category && p.priceKrw > kw.avgPriceKrw * 0.8) ??
      catalog.find((p) => p.category === kw.category) ??
      catalog[i % catalog.length];

    const sourceUsd = Math.round((kw.avgPriceKrw / USD_KRW) * (0.25 + (h % 15) / 100) * 100) / 100;
    const landed = landedCostKrw(sourceUsd, 0.3 + (h % 5) / 10);
    const marketAvg = kw.avgPriceKrw;
    const competitors = catalog
      .filter((p) => p.category === kw.category)
      .slice(0, 5)
      .map((p) => ({ sellerName: p.sellerName, priceKrw: p.priceKrw, rank: p.rank }));
    const { priceKrw } = autoMatchPrice(landed, competitors, 18);
    const margin = marginPct(landed, priceKrw);
    const monthlyUnits = Math.max(5, Math.round(kw.searchVolume / 600));

    picks.push({
      id: `im_${dateKey}_${i}`,
      productName: `${kw.keyword} ${product.name.split(" ").slice(-1)[0]}`,
      category: kw.category,
      sourceCountry: SOURCE_COUNTRIES[h % SOURCE_COUNTRIES.length],
      sourcePriceUsd: sourceUsd,
      landedCostKrw: landed,
      recommendedPriceKrw: priceKrw,
      marketAvgPriceKrw: marketAvg,
      estimatedMarginPct: margin,
      estimatedMonthlyUnits: monthlyUnits,
      estimatedMonthlyProfitKrw: Math.round((priceKrw - landed) * 0.82 * monthlyUnits),
      confidenceScore: Math.min(96, 60 + margin + (h % 20)),
      reason: `국내 평균 ${marketAvg.toLocaleString()}원 · 랜딩 ${landed.toLocaleString()}원 · 마진 ${margin}%`,
      keyword: kw.keyword,
    });
  }

  return picks;
}
