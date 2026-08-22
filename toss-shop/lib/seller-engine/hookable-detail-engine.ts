/**
 * Hookable-class 상세페이지 — 동일 상품 사진, 완전히 다른 레이아웃
 *
 * 공급처 썸네일·갤러리를 가져와 프리미엄 멀티섹션 HTML 생성.
 * Matchcut 파이프라인 실패 시 또는 도매꾹/도매매용 폴백/기본 엔진.
 */

import type { ConsignmentPick, ImportPick } from "../types";
import { fetchWholesaleProductImages } from "./wholesale-image-fetch";

export const HOOKABLE_DETAIL_VERSION = "1.0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFeatureBlocks(sellingPoints: string[]): string {
  const icons = ["✦", "◆", "●", "▲", "★"];
  return sellingPoints
    .slice(0, 5)
    .map(
      (p, i) =>
        `<div class="feat"><span class="ico">${icons[i % icons.length]}</span><p>${escapeHtml(p)}</p></div>`,
    )
    .join("");
}

function buildGallery(images: string[], title: string): string {
  if (!images.length) return "";
  const hero = images[0];
  const rest = images.slice(1, 6);
  const thumbs = rest
    .map(
      (u) =>
        `<figure class="shot"><img src="${escapeHtml(u)}" alt="${escapeHtml(title)}" loading="lazy" /></figure>`,
    )
    .join("");
  return `
    <section class="gallery">
      <div class="hero-shot"><img src="${escapeHtml(hero)}" alt="${escapeHtml(title)}" /></div>
      ${thumbs ? `<div class="shots">${thumbs}</div>` : ""}
    </section>`;
}

export type HookableDetailInput = {
  title: string;
  keyword: string;
  priceKrw: number;
  sellingPoints: string[];
  description: string;
  images: string[];
  brandLabel?: string;
  supplierLabel?: string;
};

export function buildHookableDetailHtml(input: HookableDetailInput): string {
  const features = buildFeatureBlocks(input.sellingPoints);
  const gallery = buildGallery(input.images, input.title);
  const descParas = input.description
    .split(/(?<=[.!?])\s+/)
    .slice(0, 4)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; color: #1a1a1a; line-height: 1.6; }
    .page { max-width: 720px; margin: 0 auto; }
    .top-bar { background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); color: #fff; padding: 28px 20px 32px; text-align: center; }
    .top-bar .tag { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin-bottom: 8px; }
    .top-bar h1 { font-size: 1.35rem; font-weight: 800; line-height: 1.4; }
    .top-bar .price { font-size: 1.5rem; font-weight: 900; margin-top: 12px; }
    .top-bar .price small { font-size: 0.85rem; font-weight: 500; opacity: 0.8; }
    .gallery { background: #f8fafc; }
    .hero-shot img { width: 100%; display: block; }
    .shots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2px; }
    .shot img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .why { padding: 28px 20px; background: #fff; }
    .why h2 { font-size: 1rem; font-weight: 800; margin-bottom: 16px; color: #4338ca; }
    .feat-grid { display: grid; gap: 12px; }
    .feat { display: flex; gap: 12px; align-items: flex-start; padding: 14px; background: #f5f3ff; border-radius: 12px; }
    .feat .ico { flex-shrink: 0; width: 28px; height: 28px; background: #4338ca; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .feat p { font-size: 0.9rem; font-weight: 600; color: #312e81; }
    .story { padding: 28px 20px; background: #fafafa; border-top: 1px solid #eee; }
    .story h2 { font-size: 1rem; font-weight: 800; margin-bottom: 12px; }
    .story p { font-size: 0.92rem; color: #444; margin-bottom: 10px; }
    .trust { padding: 24px 20px 32px; text-align: center; background: #fff; }
    .trust-badges { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-top: 12px; }
    .badge { font-size: 0.75rem; font-weight: 700; color: #64748b; padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 999px; }
    .foot { font-size: 0.7rem; color: #94a3b8; padding: 16px 20px 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <header class="top-bar">
      <span class="tag">${escapeHtml(input.brandLabel ?? "Premium Pick")}</span>
      <h1>${escapeHtml(input.title)}</h1>
      <p class="price">${input.priceKrw.toLocaleString()}<small>원</small></p>
    </header>
    ${gallery}
    <section class="why">
      <h2>이 상품을 추천하는 이유</h2>
      <div class="feat-grid">${features}</div>
    </section>
    <section class="story">
      <h2>상품 스토리</h2>
      ${descParas || `<p>${escapeHtml(input.description.slice(0, 400))}</p>`}
    </section>
    <section class="trust">
      <p style="font-size:0.85rem;font-weight:700;color:#334155;">안심 쇼핑</p>
      <div class="trust-badges">
        <span class="badge">정품 소싱</span>
        <span class="badge">빠른 배송</span>
        <span class="badge">교환·반품 안내</span>
      </div>
    </section>
    <p class="foot">${input.supplierLabel ? `${escapeHtml(input.supplierLabel)} · ` : ""}키워드 ${escapeHtml(input.keyword)} · Jarvis AI 상세</p>
  </div>
</body>
</html>`;
}

export async function buildHookableDetailFromPick(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
  sellingPoints: string[],
): Promise<{ html: string; images: string[]; thumbnailUrl?: string }> {
  const title = pick.suggestedTitle ?? pick.productName;
  const wholesale =
    mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const importBest =
    mode === "import" && "importBest" in pick ? pick.importBest : null;

  const productUrl = wholesale?.url ?? importBest?.url;
  const primaryImage = wholesale?.imageUrl ?? importBest?.imageUrl;

  const images = await fetchWholesaleProductImages({
    productUrl,
    primaryImageUrl: primaryImage,
    maxImages: 8,
  });

  const description =
    (pick.aiSummary ?? "").slice(0, 1200) ||
    `${title} — ${pick.keyword} 카테고리 Jarvis 검증 SKU. ${sellingPoints.join(". ")}.`;

  const html = buildHookableDetailHtml({
    title,
    keyword: pick.keyword,
    priceKrw: pick.recommendedPriceKrw,
    sellingPoints,
    description,
    images,
    brandLabel: "Jarvis Pick",
    supplierLabel:
      wholesale?.platform === "domeme"
        ? "도매매"
        : wholesale?.platform === "domeggook"
          ? "도매꾹"
          : mode === "import" && "sourceCountry" in pick
            ? pick.sourceCountry
            : undefined,
  });

  return {
    html,
    images,
    thumbnailUrl: images[0] ?? primaryImage,
  };
}
