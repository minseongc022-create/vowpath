/**
 * Jarvis AI 상세페이지 생성 (Hookable-class)
 *
 * Matchcut 연결 전까지 Jarvis가 직접 HTML 상세페이지·셀링포인트·키워드를 생성.
 * 상위셀러 전술(차별화·롱테일·셀링포인트 상단) 반영.
 */

import type { ConsignmentPick, ImportPick, JarvisDetailPageBundle } from "../types";
import { requestMatchcutDetailPage } from "./matchcut-adapter";

export const DETAIL_PAGE_ENGINE_VERSION = "1.0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function buildJarvisDetailHtml(input: {
  title: string;
  keyword: string;
  priceKrw: number;
  sellingPoints: string[];
  description: string;
  supplierLabel?: string;
  thumbnailUrl?: string;
}): string {
  const pointsHtml = input.sellingPoints
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("");
  const hero = input.thumbnailUrl
    ? `<div class="hero"><img src="${escapeHtml(input.thumbnailUrl)}" alt="thumbnail" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #fafafa; color: #111; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }
    .badge { display: inline-block; background: #7c3aed; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
    h1 { font-size: 1.5rem; line-height: 1.35; margin: 0 0 8px; }
    .price { font-size: 1.25rem; font-weight: 800; color: #2563eb; margin-bottom: 16px; }
    .points { background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .points h2 { font-size: 1rem; margin: 0 0 10px; }
    .points ul { margin: 0; padding-left: 1.2rem; line-height: 1.7; color: #333; }
    .desc { background: #fff; border-radius: 12px; padding: 16px 20px; line-height: 1.7; color: #444; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .hero img { width: 100%; border-radius: 12px; display: block; margin-bottom: 20px; }
    .foot { margin-top: 24px; font-size: 0.75rem; color: #999; }
  </style>
</head>
<body>
  <div class="wrap">
    <span class="badge">Jarvis AI 상세</span>
    <h1>${escapeHtml(input.title)}</h1>
    <p class="price">${input.priceKrw.toLocaleString()}원</p>
    ${hero}
    <div class="points">
      <h2>왜 이 상품인가요?</h2>
      <ul>${pointsHtml}</ul>
    </div>
    <div class="desc">${escapeHtml(input.description)}</div>
    <p class="foot">${input.supplierLabel ? `공급: ${escapeHtml(input.supplierLabel)} · ` : ""}키워드: ${escapeHtml(input.keyword)} · Effiroad Jarvis</p>
  </div>
</body>
</html>`;
}

export async function buildJarvisDetailPage(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
): Promise<JarvisDetailPageBundle> {
  const title = pick.suggestedTitle ?? pick.productName;
  const priceKrw = pick.recommendedPriceKrw;
  const sellingPoints = buildSellingPoints(pick);
  const searchKeywords = extractKeywords(pick.keyword, title);
  const wholesale =
    mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const importUrl =
    mode === "import" && "importBest" in pick ? pick.importBest?.url : undefined;

  const description =
    (pick.aiSummary ?? "").slice(0, 1200) ||
    `${title} — ${pick.keyword} 카테고리 Jarvis 추천 SKU. ${sellingPoints.join(". ")}.`;

  const matchcut = await requestMatchcutDetailPage({
    listingUrl: wholesale?.url ?? importUrl,
    keyword: pick.keyword,
    productName: pick.productName,
  });

  if (matchcut.status === "ready") {
    return {
      source: "matchcut",
      html: matchcut.html,
      thumbnailUrl: matchcut.thumbnailUrl,
      sellingPoints,
      searchKeywords,
      matchcutReady: true,
    };
  }

  const html = buildJarvisDetailHtml({
    title,
    keyword: pick.keyword,
    priceKrw,
    sellingPoints,
    description,
    supplierLabel:
      wholesale?.platform === "domeme"
        ? "도매매"
        : wholesale?.platform === "domeggook"
          ? "도매꾹"
          : mode === "import" && "sourceCountry" in pick
          ? pick.sourceCountry
          : undefined,
    thumbnailUrl: wholesale?.url,
  });

  return {
    source: "jarvis_ai",
    html,
    thumbnailUrl: wholesale?.url,
    sellingPoints,
    searchKeywords,
    matchcutReady: false,
    matchcutNote: matchcut.note,
  };
}
