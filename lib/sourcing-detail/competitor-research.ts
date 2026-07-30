import { openAiJsonCompletion } from "../openai-json";
import type { ProductAnalysis } from "./product-analysis";

export type CompetitorProduct = {
  title: string;
  mallName: string;
  price?: number;
  link?: string;
  platform: "smartstore" | "coupang" | "other";
};

export type CompetitorInsight = {
  searchQuery: string;
  source: "naver_api" | "ai_category";
  topProducts: CompetitorProduct[];
  /** 상위 셀러들이 공통으로 강조하는 포인트 */
  commonStrengths: string[];
  /** 우리가 더 어필해야 할 차별점 */
  recommendedAppeals: string[];
  /** 상세페이지에 넣을 섹션 제안 */
  suggestedSections: string[];
  /** 톤 가이드 */
  copyTone: string;
};

type NaverShopItem = {
  title?: string;
  lprice?: string;
  hprice?: string;
  mallName?: string;
  link?: string;
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}

function detectPlatform(mallName: string): CompetitorProduct["platform"] {
  const lower = mallName.toLowerCase();
  if (lower.includes("쿠팡") || lower.includes("coupang")) return "coupang";
  if (lower.includes("스마트스토어") || lower.includes("smartstore") || lower.includes("네이버"))
    return "smartstore";
  return "other";
}

export async function searchNaverShopping(query: string): Promise<CompetitorProduct[]> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return [];

  const url = new URL("https://openapi.naver.com/v1/search/shop.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", "20");
  url.searchParams.set("sort", "sim");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { items?: NaverShopItem[] };
    const products: CompetitorProduct[] = [];

    for (const item of data.items ?? []) {
      const mallName = stripHtml(item.mallName ?? "");
      const title = stripHtml(item.title ?? "");
      if (!title) continue;
      products.push({
        title,
        mallName: mallName || "unknown",
        price: item.lprice ? Number(item.lprice) : undefined,
        link: item.link,
        platform: detectPlatform(mallName),
      });
    }

    // Prefer Smart Store + Coupang listings
    products.sort((a, b) => {
      const score = (p: CompetitorProduct) =>
        (p.platform === "coupang" ? 2 : 0) + (p.platform === "smartstore" ? 2 : 0);
      return score(b) - score(a);
    });

    return products.slice(0, 8);
  } catch {
    return [];
  }
}

type InsightPayload = {
  commonStrengths: string[];
  recommendedAppeals: string[];
  suggestedSections: string[];
  copyTone: string;
};

export async function researchCompetitors(params: {
  analysis: ProductAnalysis;
  listingTitle?: string;
}): Promise<CompetitorInsight> {
  const topProducts = await searchNaverShopping(params.analysis.searchQuery);
  const source: CompetitorInsight["source"] = topProducts.length > 0 ? "naver_api" : "ai_category";

  const productLines =
    topProducts.length > 0
      ? topProducts
          .map(
            (p, i) =>
              `[${i + 1}] ${p.title} | ${p.mallName} | ${p.price ? `${p.price.toLocaleString()}원` : "가격미상"} | ${p.platform}`,
          )
          .join("\n")
      : "(실시간 검색 결과 없음 — 카테고리 베스트 프랙티스 기반)";

  const payload = await openAiJsonCompletion<InsightPayload>({
    system: `You are a Korean e-commerce detail-page strategist for Coupang and Naver Smart Store sellers.
Analyze top competitor listings and return actionable JSON in Korean.`,
    user: `Product: ${params.analysis.productNameKo}
Category: ${params.analysis.category}
Search query: ${params.analysis.searchQuery}
Listing title: ${params.listingTitle ?? ""}
Key features: ${params.analysis.keyFeatures.join(", ")}

Top competitor products from Naver Shopping:
${productLines}

Return JSON:
{
  "commonStrengths": ["5 items — what top sellers emphasize in titles/detail (배송, 소재, 사이즈, A/S 등)"],
  "recommendedAppeals": ["4 items — how OUR listing should beat them with professional copy"],
  "suggestedSections": ["6-8 section headings for detail page HTML in Korean"],
  "copyTone": "one sentence — tone guide (e.g. 프리미엄 감성, 신뢰 중심, 가성비 직설)"
}

Write natural Korean a native seller would use — no awkward translation.`,
    temperature: 0.3,
    timeoutMs: 25_000,
  });

  return {
    searchQuery: params.analysis.searchQuery,
    source,
    topProducts: topProducts.slice(0, 5),
    commonStrengths: payload.commonStrengths?.slice(0, 6) ?? [],
    recommendedAppeals: payload.recommendedAppeals?.slice(0, 5) ?? [],
    suggestedSections: payload.suggestedSections?.slice(0, 8) ?? [],
    copyTone: payload.copyTone ?? "신뢰감 있는 전문 셀러 톤",
  };
}
