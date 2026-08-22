/**
 * 도매꾹/도매매 상품 구성 분석 — Item Winner(대표아이템) 함정 회피
 */

import type { CatalogProduct, ConsignmentPick, WholesaleListing } from "../types";
import { decideCatalogStrategy, scoreRepresentativeItemWin } from "./policy-engine";

export const WHOLESALE_COMPOSITION_VERSION = "1.0";

export type CompositionRisk = {
  code: string;
  level: "info" | "warn" | "block";
  message: string;
  mitigation: string;
};

export type WholesaleCompositionReport = {
  engineVersion: string;
  platform: string;
  title: string;
  unitPriceKrw: number;
  moq: number;
  compositionTags: string[];
  differentiationSuffix?: string;
  recommendedTitle: string;
  catalogMode: "win_representative" | "avoid_catalog";
  isolationScore: number;
  itemWinnerRisk: "low" | "medium" | "high";
  risks: CompositionRisk[];
  brief: string;
  listingReady: boolean;
};

function extractCompositionTags(title: string): string[] {
  const tags: string[] = [];
  const patterns: [RegExp, string][] = [
    [/\d+\s*(?:ml|mL|L|g|kg|개|입|p|P|팩|세트)/i, "용량/수량"],
    [/(?:세트|SET|set|\+|플러스|듀오|트리오|2\+1|1\+1)/, "구성"],
    [/(?:대용량|소용량|미니|리필|패밀리)/, "용량군"],
    [/(?:선물|기획|한정|특가)/, "기획"],
    [/(?:색상|컬러|블랙|화이트|그레이|핑크|블루)/i, "색상"],
  ];
  for (const [re, label] of patterns) {
    if (re.test(title) && !tags.includes(label)) tags.push(label);
  }
  if (tags.length === 0) tags.push("단품");
  return tags;
}

function assessItemWinnerRisk(input: {
  pick: ConsignmentPick;
  wholesale: WholesaleListing;
  catalogPeers: CatalogProduct[];
}): { risk: "low" | "medium" | "high"; risks: CompositionRisk[] } {
  const risks: CompositionRisk[] = [];
  const title = input.wholesale.title.toLowerCase();
  const generic = ["단품", "1개", "기본", "일반"];
  const isGeneric = generic.some((g) => title.includes(g)) && title.length < 25;

  if (isGeneric) {
    risks.push({
      code: "GENERIC_TITLE",
      level: "warn",
      message: "도매 원제목이 단순 — 토스 카탈로그에 흡수될 위험",
      mitigation: "구성·용량·색상을 제목에 명시 (policy-engine 차별화 suffix 적용)",
    });
  }

  if (input.wholesale.moq > 1) {
    risks.push({
      code: "MOQ_GT1",
      level: "block",
      message: `MOQ ${input.wholesale.moq} — 위탁 단건 발주 불가`,
      mitigation: "도매매 MOQ≤1 SKU로 교체",
    });
  }

  const peerCount = input.catalogPeers.filter(
    (p) => p.name.includes(input.pick.keyword.slice(0, 4)) || input.pick.keyword.includes(p.name.slice(0, 4)),
  ).length;

  if (peerCount >= 8) {
    risks.push({
      code: "CROWDED_CATALOG",
      level: "warn",
      message: `동일 키워드 카탈로그 경쟁 ${peerCount}건+`,
      mitigation: "avoid_catalog 모드 — 구성 차별화 또는 롱테일 키워드",
    });
  }

  const hasBlock = risks.some((r) => r.level === "block");
  const warnCount = risks.filter((r) => r.level === "warn").length;
  const risk: "low" | "medium" | "high" =
    hasBlock ? "high" : warnCount >= 2 ? "high" : warnCount === 1 ? "medium" : "low";

  return { risk, risks };
}

export function analyzeWholesaleComposition(input: {
  pick: ConsignmentPick;
  wholesale: WholesaleListing;
  catalog?: CatalogProduct[];
}): WholesaleCompositionReport {
  const catalog = input.catalog ?? [];
  const compositionTags = extractCompositionTags(input.wholesale.title);

  const catalogWin =
    input.pick.catalogWin ??
    scoreRepresentativeItemWin({
      priceKrw: input.pick.recommendedPriceKrw,
      shippingFeeKrw: input.pick.recommendedPriceKrw >= 15000 ? 0 : 2500,
      competitorPrices: input.pick.competitorPrices.map((c) => c.priceKrw),
      freeShippingRecommended: input.pick.recommendedPriceKrw >= 15000,
      reviewCount: 0,
      competitionIntensity: input.pick.competitionIntensity,
      productCount: input.pick.competitorPrices.length || 10,
      marginPct: input.pick.estimatedMarginPct,
    });

  const strategy =
    input.pick.catalogStrategy ??
    decideCatalogStrategy({
      catalogWin,
      keyword: input.pick.keyword,
      productName: input.pick.productName,
      suggestedTitle: input.pick.suggestedTitle ?? input.pick.productName,
      category: input.pick.category,
      marginPct: input.pick.estimatedMarginPct,
      competitionIntensity: input.pick.competitionIntensity,
      searchVolume: input.pick.searchVolume,
    });

  const { risk, risks } = assessItemWinnerRisk({
    pick: input.pick,
    wholesale: input.wholesale,
    catalogPeers: catalog,
  });

  const listingReady = !risks.some((r) => r.level === "block") && input.wholesale.moq <= 1;

  return {
    engineVersion: WHOLESALE_COMPOSITION_VERSION,
    platform: input.wholesale.platform,
    title: input.wholesale.title,
    unitPriceKrw: input.wholesale.unitPriceKrw,
    moq: input.wholesale.moq,
    compositionTags,
    differentiationSuffix:
      strategy.recommendedTitle !== input.pick.suggestedTitle ? strategy.recommendedTitle : undefined,
    recommendedTitle: strategy.recommendedTitle,
    catalogMode: strategy.mode,
    isolationScore: strategy.isolationScore ?? input.pick.catalogStrategy?.isolationScore ?? 0,
    itemWinnerRisk: risk,
    risks,
    brief: strategy.rationale,
    listingReady,
  };
}
