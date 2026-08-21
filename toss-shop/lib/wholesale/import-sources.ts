import type { ImportSourceListing, ImportSourceResult } from "./types";

const USD_KRW = Number(process.env.TOSS_SHOP_KRW_PER_USD) || 1350;
const JPY_KRW = 9.2;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function encode1688Keyword(keyword: string): string {
  return encodeURIComponent(keyword);
}

export function buildChinaSearchUrls(keyword: string): { platform: "1688" | "taobao"; searchUrl: string }[] {
  const q = encode1688Keyword(keyword);
  return [
    {
      platform: "1688",
      searchUrl: `https://s.1688.com/selloffer/offer_search.htm?keywords=${q}&sortType=price&descendOrder=false`,
    },
    {
      platform: "taobao",
      searchUrl: `https://s.taobao.com/search?q=${q}&sort=price-asc`,
    },
  ];
}

export function buildJapanSearchUrls(keyword: string): { platform: "rakuten" | "yahoo_jp"; searchUrl: string }[] {
  const q = encodeURIComponent(keyword);
  return [
    {
      platform: "rakuten",
      searchUrl: `https://search.rakuten.co.jp/search/mall/${q}/?s=2&st=O`,
    },
    {
      platform: "yahoo_jp",
      searchUrl: `https://shopping.yahoo.co.jp/search?p=${q}&X=2#X=2&tab_ex=commerce&sc_i=shopping-tab`,
    },
  ];
}

function estimateChinaUsd(keyword: string, tossAvgPriceKrw: number): number {
  const h = hashString(keyword + "cn");
  const ratio = 0.18 + (h % 8) / 100;
  return Math.round((tossAvgPriceKrw / USD_KRW) * ratio * 100) / 100;
}

function estimateJapanJpy(keyword: string, tossAvgPriceKrw: number): number {
  const h = hashString(keyword + "jp");
  const ratio = 0.35 + (h % 10) / 100;
  return Math.round((tossAvgPriceKrw / JPY_KRW) * ratio);
}

function landedFromUsd(usd: number, weightKg = 0.45): number {
  const productKrw = Math.round(usd * USD_KRW);
  const shippingKrw = Math.round(weightKg * 4500 + 3500);
  const dutyKrw = Math.round(productKrw * 0.08);
  return productKrw + shippingKrw + dutyKrw;
}

function landedFromJpy(jpy: number, weightKg = 0.4): number {
  const productKrw = Math.round(jpy * JPY_KRW);
  const shippingKrw = Math.round(weightKg * 5200 + 4000);
  const dutyKrw = Math.round(productKrw * 0.06);
  return productKrw + shippingKrw + dutyKrw;
}

export function buildImportSourceRecommendations(input: {
  keyword: string;
  tossAvgPriceKrw: number;
  categoryLabel?: string;
  targetRetailKrw?: number;
}): ImportSourceResult {
  const { keyword, tossAvgPriceKrw } = input;
  const target = input.targetRetailKrw ?? tossAvgPriceKrw;

  const chinaUsd = estimateChinaUsd(keyword, tossAvgPriceKrw);
  const japanJpy = estimateJapanJpy(keyword, tossAvgPriceKrw);
  const chinaUrls = buildChinaSearchUrls(keyword);
  const japanUrls = buildJapanSearchUrls(keyword);

  const china: ImportSourceListing[] = chinaUrls.map((u, i) => {
    const usd = Math.round(chinaUsd * (1 + i * 0.08) * 100) / 100;
    const landed = landedFromUsd(usd);
    const margin = target > 0 ? Math.round(((target - landed) / target) * 1000) / 10 : 0;
    return {
      platform: u.platform,
      country: "중국",
      title: `${keyword} ${u.platform === "1688" ? "공장직거래" : "소량구매"} 후보`,
      sourcePriceUsd: usd,
      sourcePriceKrw: Math.round(usd * USD_KRW),
      url: u.searchUrl,
      searchUrl: u.searchUrl,
      source: "estimated",
      landedCostKrw: landed,
      estimatedMarginPct: margin,
    };
  });

  const japan: ImportSourceListing[] = japanUrls.map((u, i) => {
    const jpy = Math.round(japanJpy * (1 + i * 0.05));
    const landed = landedFromJpy(jpy);
    const margin = target > 0 ? Math.round(((target - landed) / target) * 1000) / 10 : 0;
    return {
      platform: u.platform,
      country: "일본",
      title: `${keyword} ${u.platform === "rakuten" ? "라쿠텐" : "Yahoo"} 프리미엄 후보`,
      sourcePriceUsd: Math.round((jpy * JPY_KRW) / USD_KRW * 100) / 100,
      sourcePriceKrw: Math.round(jpy * JPY_KRW),
      url: u.searchUrl,
      searchUrl: u.searchUrl,
      source: "estimated",
      landedCostKrw: landed,
      estimatedMarginPct: margin,
    };
  });

  const all = [...china, ...japan].filter((s) => (s.estimatedMarginPct ?? 0) >= 8);
  const bestMatch =
    all.sort((a, b) => (b.estimatedMarginPct ?? 0) - (a.estimatedMarginPct ?? 0))[0] ??
    china[0] ??
    null;

  const primaryCountry: "중국" | "일본" =
    bestMatch?.country === "일본" && (bestMatch.estimatedMarginPct ?? 0) > (china[0]?.estimatedMarginPct ?? 0)
      ? "일본"
      : bestMatch?.country === "일본"
        ? "일본"
        : "중국";

  const sourcingBrief =
    primaryCountry === "중국"
      ? `토스 「${keyword}」 키워드는 중국 1688·타오바오에서 FOB $${chinaUsd.toFixed(2)} 전후 소싱 시 마진 ${bestMatch?.estimatedMarginPct ?? 0}% 예상. 1688 검색 → 샘플 확인 → 랜딩비 재계산 후 등록 권장.`
      : `토스 「${keyword}」는 일본 라쿠텐·Yahoo 프리미엄 라인(${japanJpy.toLocaleString()}엔 전후)이 국내 중위가 대비 차별화에 유리. KC/표시사항 확인 후 소량 테스트 권장.`;

  return {
    keyword,
    primaryCountry,
    china,
    japan,
    bestMatch,
    sourcingBrief,
    searchedAt: new Date().toISOString(),
  };
}

export { USD_KRW };
