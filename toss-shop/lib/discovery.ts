import type { TossShopCategory } from "./types";
import { categoryLabel } from "./format";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type DiscoveryKeyword = {
  keyword: string;
  category: TossShopCategory;
  searchVolume: number;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  productCount: number;
  competitionIntensity: number;
  competitionGrade: "excellent" | "good" | "fair" | "poor";
  avgPriceKrw: number;
  trendPct: number;
  trendDirection: "up" | "down" | "flat";
};

export type TrendingKeyword = {
  rank: number;
  keyword: string;
  searchVolume: number;
  trendPct: number;
};

export type TrendingProduct = {
  rank: number;
  id: string;
  name: string;
  priceKrw: number;
  reviewCount: number;
  sellerName: string;
};

const KEYWORDS_BY_CATEGORY: Record<TossShopCategory, string[]> = {
  food: ["방울토마토", "제철사과", "한우등심", "그릭요거트", "오트밀", "프로틴쉐이크", "냉동만두", "유기농쌀", "샐러드믹스", "견과류"],
  beauty: ["히알루론크림", "선크림", "립틴트", "클렌징오일", "비타민세럼", "마스크팩", "선물세트", "향수", "네일", "헤어에센스"],
  home: ["무선청소기", "공기청정기", "주방세제", "수납바구니", "LED조명", "침구세트", "욕실매트", "디퓨저", "행거", "세탁세제"],
  digital: ["블루투스이어폰", "보조배터리", "스마트워치", "태블릿케이스", "USB허브", "웹캠", "키보드", "마우스", "충전기", "스피커"],
  fashion: ["후드티", "슬랙스", "운동화", "가디건", "코트", "백팩", "양말", "모자", "벨트", "목걸이"],
  health: ["비타민C", "오메가3", "유산균", "프로틴바", "홍삼", "마그네슘", "루테인", "콜라겐", "단백질", "건강즙"],
};

function gradeFromIntensity(intensity: number): DiscoveryKeyword["competitionGrade"] {
  if (intensity < 0.5) return "excellent";
  if (intensity < 1) return "good";
  if (intensity < 2) return "fair";
  return "poor";
}

function buildDiscoveryKeyword(keyword: string, category: TossShopCategory): DiscoveryKeyword {
  const h = hashString(keyword + category);
  const searchVolume = 800 + (h % 42000);
  const mobileRatio = 0.55 + (h % 35) / 100;
  const mobileSearchVolume = Math.round(searchVolume * mobileRatio);
  const pcSearchVolume = searchVolume - mobileSearchVolume;
  const productCount = 50 + (h % 2500);
  const competitionIntensity = Math.round((productCount / Math.max(searchVolume, 1)) * 100) / 100;
  const avgPriceKrw = 5000 + (h % 95000);
  const trendPct = ((h % 41) - 20);
  const trendDirection: DiscoveryKeyword["trendDirection"] =
    trendPct > 5 ? "up" : trendPct < -5 ? "down" : "flat";

  return {
    keyword,
    category,
    searchVolume,
    pcSearchVolume,
    mobileSearchVolume,
    productCount,
    competitionIntensity,
    competitionGrade: gradeFromIntensity(competitionIntensity),
    avgPriceKrw,
    trendPct,
    trendDirection,
  };
}

export function getDiscoveryKeywords(category?: TossShopCategory): DiscoveryKeyword[] {
  const categories = category ? [category] : (Object.keys(KEYWORDS_BY_CATEGORY) as TossShopCategory[]);
  const items: DiscoveryKeyword[] = [];
  for (const cat of categories) {
    for (const kw of KEYWORDS_BY_CATEGORY[cat]) {
      items.push(buildDiscoveryKeyword(kw, cat));
    }
  }
  return items.sort((a, b) => b.searchVolume - a.searchVolume);
}

export function getTrendingKeywords(limit = 10): TrendingKeyword[] {
  const all = getDiscoveryKeywords();
  return all
    .sort((a, b) => b.trendPct - a.trendPct)
    .slice(0, limit)
    .map((k, i) => ({
      rank: i + 1,
      keyword: k.keyword,
      searchVolume: k.searchVolume,
      trendPct: k.trendPct,
    }));
}

export function getCategoryTabs(): Array<{ id: TossShopCategory | ""; label: string }> {
  return [
    { id: "", label: "전체" },
    ...(Object.keys(KEYWORDS_BY_CATEGORY) as TossShopCategory[]).map((c) => ({
      id: c,
      label: categoryLabel(c),
    })),
  ];
}

export function filterDiscoveryKeywords(
  items: DiscoveryKeyword[],
  opts: {
    minSearch?: number;
    maxCompetition?: number;
    sort?: "search" | "competition" | "trend";
  },
): DiscoveryKeyword[] {
  let result = [...items];
  if (opts.minSearch) result = result.filter((k) => k.searchVolume >= opts.minSearch!);
  if (opts.maxCompetition) result = result.filter((k) => k.competitionIntensity <= opts.maxCompetition!);
  if (opts.sort === "competition") result.sort((a, b) => a.competitionIntensity - b.competitionIntensity);
  else if (opts.sort === "trend") result.sort((a, b) => b.trendPct - a.trendPct);
  else result.sort((a, b) => b.searchVolume - a.searchVolume);
  return result;
}
