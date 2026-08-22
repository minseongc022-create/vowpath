/**
 * Jarvis AI 상세페이지 생성 (Hookable-class)
 *
 * Matchcut 어댑터 → Hookable 템플릿 또는 1688 비전 파이프라인.
 * 상위셀러 전술(차별화·롱테일·셀링포인트 상단) 반영.
 */

import type { ConsignmentPick, ImportPick, JarvisDetailPageBundle } from "../types";
import { requestDetailPageFromProviders } from "./detail-page-providers";
import type { DetailPageProviderId } from "./detail-page-providers";

export const DETAIL_PAGE_ENGINE_VERSION = "3.0";

function mapProviderToSource(provider: DetailPageProviderId): JarvisDetailPageBundle["source"] {
  if (provider === "matchcut_pipeline") return "matchcut";
  if (provider === "openai_premium") return "openai_premium";
  if (provider === "hookable_api") return "hookable_api";
  if (provider === "draph") return "draph";
  if (provider === "sellerbiseo") return "sellerbiseo";
  if (provider === "hookable_local") return "jarvis_ai";
  return "jarvis_ai";
}

function extractKeywords(keyword: string, title: string, max = 10): string[] {
  const raw = `${keyword} ${title}`
    .split(/[\s,·/]+/)
    .map((w) => w.replace(/[^0-9a-zA-Z가-힣]/g, ""))
    .filter((w) => w.length >= 2 && w.length <= 10);
  const uniq = [...new Set(raw)];
  return uniq.slice(0, max);
}

function buildSellingPoints(pick: ConsignmentPick | ImportPick): string[] {
  const points: string[] = [];
  if (pick.topSellerPlaybook?.tactics.filter((t) => t.applied).length) {
    points.push(
      ...pick.topSellerPlaybook.tactics
        .filter((t) => t.applied)
        .slice(0, 3)
        .map((t) => t.title),
    );
  }
  if (pick.estimatedMarginPct >= 18) {
    points.push(`합리적 가격 · 순마진 ${pick.estimatedMarginPct}% 확보`);
  }
  if ("wholesaleBest" in pick && pick.wholesaleBest?.platform === "domeme") {
    points.push("도매매 단품(MOQ≤1) — 주문 즉시 발주 가능");
  }
  if (pick.catalogStrategy?.mode === "avoid_catalog") {
    points.push("카탈로그 차별 구성 — 가격전쟁 회피");
  } else if (pick.catalogWin?.representativeItemScore != null && pick.catalogWin.representativeItemScore >= 58) {
    points.push("토스 대표아이템(배송비 포함 총액) 경쟁력");
  }
  if (pick.policyChecklist?.length) {
    points.push(`정책 체크 ${pick.policyChecklist.length}항목 준수`);
  }
  if (points.length < 3) {
    points.push("Jarvis 검증 소싱 · 상위셀러 전술 적용");
  }
  return points.slice(0, 5);
}

export async function buildJarvisDetailPage(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): Promise<JarvisDetailPageBundle> {
  const title = pick.suggestedTitle ?? pick.productName;
  const sellingPoints = buildSellingPoints(pick);
  const searchKeywords = extractKeywords(pick.keyword, title);
  const wholesale =
    mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const importUrl =
    mode === "import" && "importBest" in pick ? pick.importBest?.url : undefined;
  const importImage =
    mode === "import" && "importBest" in pick ? pick.importBest?.imageUrl : undefined;

  const detail = await requestDetailPageFromProviders({
    listingUrl: wholesale?.url ?? importUrl,
    referenceImageUrl: wholesale?.imageUrl ?? importImage,
    keyword: pick.keyword,
    productName: pick.productName,
    pick,
    mode,
    sellingPoints,
    generateAngles: mode === "import" && Boolean(importUrl?.includes("1688")),
  });

  if (detail.status === "ready" && detail.html) {
    return {
      source: mapProviderToSource(detail.provider),
      html: detail.html,
      thumbnailUrl: detail.thumbnailUrl,
      sellingPoints,
      searchKeywords,
      matchcutReady: detail.provider === "matchcut_pipeline",
      imageUrls: detail.generatedImages,
      detailProvider: detail.provider,
      detailCostKrw: detail.costEstimateKrw,
    };
  }

  return {
    source: "matchcut_pending",
    html: `<p>상세페이지 생성 실패 — ${detail.note ?? "알 수 없는 오류"}</p>`,
    sellingPoints,
    searchKeywords,
    matchcutReady: false,
    matchcutNote: detail.note,
    detailProvider: detail.provider,
  };
}
