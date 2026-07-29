import type { CompetitorInsight } from "./competitor-research";
import type { DetailCopy } from "./detail-copy";
import type { ProductAnalysis } from "./product-analysis";
import type { GeneratedAngle, MatchResult, ScrapedListing } from "./types";

function imgSrc(angle: GeneratedAngle): string {
  if (angle.imageBase64) {
    return `data:image/png;base64,${angle.imageBase64}`;
  }
  if (angle.imageUrl) return angle.imageUrl;
  return "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CATEGORY_ACCENT: Record<ProductAnalysis["category"], string> = {
  fashion: "#1a1a2e",
  electronics: "#2563eb",
  home: "#059669",
  beauty: "#db2777",
  sports: "#ea580c",
  kids: "#7c3aed",
  food: "#b45309",
  accessories: "#0891b2",
  generic: "#3182F6",
};

function categoryHeroStyle(category: ProductAnalysis["category"]): string {
  const accent = CATEGORY_ACCENT[category];
  return `
    .hero-banner { background: linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%); color: #fff; }
    .accent { color: ${accent}; }
    .badge { background: ${accent}15; color: ${accent}; border: 1px solid ${accent}30; }
  `;
}

export function buildDetailPageHtml(params: {
  listing: ScrapedListing;
  match: MatchResult;
  angles: GeneratedAngle[];
  analysis?: ProductAnalysis;
  copy?: DetailCopy;
  insights?: CompetitorInsight;
}): string {
  const { listing, match, angles, analysis, copy, insights } = params;
  const title = copy?.headline || analysis?.productNameKo || listing.title || "상품 상세페이지";
  const category = analysis?.category ?? "generic";
  const accentStyle = categoryHeroStyle(category);

  const angleBlocks = angles
    .filter((a) => imgSrc(a))
    .map(
      (a) =>
        `<section class="angle-block"><img src="${imgSrc(a)}" alt="${escapeHtml(a.angle)}" loading="lazy" /><p class="angle-cap">${escapeHtml(angleLabelKo(a.angle))}</p></section>`,
    )
    .join("\n");

  const skuNote = match.bestMatch?.skuLabel
    ? `<p class="sku-tag">선택 옵션: ${escapeHtml(match.bestMatch.skuLabel)} · 매칭 ${match.bestMatch.score}%</p>`
    : "";

  const featureList = copy?.featureBullets
    .map((b) => `<li>${escapeHtml(b.replace(/^[✓✔]\s*/, ""))}</li>`)
    .join("\n");

  const specRows = copy?.specTable
    .map((r) => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`)
    .join("\n");

  const badges = copy?.trustBadges
    .map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
    .join("");

  const faqBlocks = copy?.faq
    .map(
      (f) =>
        `<details class="faq-item"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`,
    )
    .join("\n");

  const insightBlock =
    insights && insights.commonStrengths.length > 0
      ? `<section class="insight-section">
          <h2 class="section-title">시장 인사이트</h2>
          <p class="insight-note">검색어 「${escapeHtml(insights.searchQuery)}」 기준 ${insights.source === "naver_api" ? "네이버 쇼핑 상위 상품" : "카테고리 베스트"} 분석</p>
          <ul class="insight-list">${insights.commonStrengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
        </section>`
      : "";

  const sectionsFromInsights =
    insights?.suggestedSections
      .filter((s) => !copy?.headline.includes(s))
      .slice(0, 4)
      .map((s) => `<div class="section-chip">${escapeHtml(s)}</div>`)
      .join("") ?? "";

  const matchedUrl = match.bestMatch?.imageUrl;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="keywords" content="${escapeHtml((copy?.seoKeywords ?? []).join(", "))}" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; background: #f8fafc; color: #0f172a; line-height: 1.6; }
    .wrap { max-width: 860px; margin: 0 auto; padding: 0 0 48px; }
    .hero-banner { padding: 48px 24px 40px; text-align: center; }
    .hero-banner h1 { font-size: 1.75rem; font-weight: 800; line-height: 1.35; letter-spacing: -0.02em; }
    .hero-banner .sub { margin-top: 10px; font-size: 1.05rem; opacity: 0.92; font-weight: 500; }
    .content { padding: 24px 16px; }
    .hook { font-size: 1rem; color: #334155; margin-bottom: 20px; line-height: 1.75; }
    .sku-tag { font-size: 0.85rem; color: #3182F6; font-weight: 600; margin-bottom: 16px; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
    .badge { padding: 6px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .section-title { font-size: 1.15rem; font-weight: 700; margin: 32px 0 14px; color: #0f172a; }
    .features { list-style: none; background: #fff; border-radius: 16px; padding: 20px 20px 20px 28px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .features li { position: relative; padding: 6px 0; font-size: 0.95rem; color: #334155; }
    .features li::before { content: "✓"; position: absolute; left: -20px; color: #3182F6; font-weight: 700; }
    .spec-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .spec-table th, .spec-table td { padding: 12px 16px; text-align: left; font-size: 0.9rem; border-bottom: 1px solid #f1f5f9; }
    .spec-table th { width: 35%; background: #f8fafc; color: #64748b; font-weight: 600; }
    .gallery { display: grid; gap: 16px; margin-top: 8px; }
    .angle-block { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .angle-block img { width: 100%; height: auto; display: block; }
    .angle-cap { text-align: center; font-size: 0.78rem; color: #94a3b8; padding: 10px; }
    .ref-image { margin: 20px 0; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .ref-image img { width: 100%; display: block; }
    .faq-item { background: #fff; border-radius: 12px; margin-bottom: 8px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
    .faq-item summary { font-weight: 600; cursor: pointer; font-size: 0.92rem; }
    .faq-item p { margin-top: 8px; font-size: 0.88rem; color: #64748b; }
    .cta { margin-top: 32px; text-align: center; padding: 24px; background: #fff; border-radius: 16px; font-size: 1.05rem; font-weight: 700; color: #3182F6; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .section-chip { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 8px; font-size: 0.78rem; }
    .insight-section { background: #fff; border-radius: 16px; padding: 20px; margin-top: 24px; border: 1px dashed #cbd5e1; }
    .insight-note { font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px; }
    .insight-list { padding-left: 18px; font-size: 0.88rem; color: #475569; }
    .insight-list li { margin: 4px 0; }
    .footer { margin-top: 40px; padding: 16px; font-size: 0.72rem; color: #94a3b8; text-align: center; }
    ${accentStyle}
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero-banner">
      <h1>${escapeHtml(title)}</h1>
      ${copy?.subheadline ? `<p class="sub">${escapeHtml(copy.subheadline)}</p>` : ""}
    </header>
    <div class="content">
      ${skuNote}
      ${copy?.hookParagraph ? `<p class="hook">${escapeHtml(copy.hookParagraph)}</p>` : `<p class="hook">${escapeHtml(match.referenceDescription)}</p>`}
      ${badges ? `<div class="badges">${badges}</div>` : ""}
      ${sectionsFromInsights ? `<div class="chips">${sectionsFromInsights}</div>` : ""}

      ${featureList ? `<h2 class="section-title accent">핵심 포인트</h2><ul class="features">${featureList}</ul>` : ""}

      ${matchedUrl ? `<div class="ref-image"><img src="${matchedUrl}" alt="매칭된 상품" loading="lazy" /></div>` : ""}

      ${angleBlocks ? `<h2 class="section-title accent">상품 상세컷</h2><div class="gallery">${angleBlocks}</div>` : ""}

      ${specRows ? `<h2 class="section-title accent">상품 정보</h2><table class="spec-table"><tbody>${specRows}</tbody></table>` : ""}

      ${faqBlocks ? `<h2 class="section-title accent">자주 묻는 질문</h2>${faqBlocks}` : ""}

      ${insightBlock}

      ${copy?.ctaLine ? `<div class="cta">${escapeHtml(copy.ctaLine)}</div>` : ""}

      <p class="footer">MatchCut 생성 · 소싱: ${escapeHtml(listing.url)}</p>
    </div>
  </div>
</body>
</html>`;
}

function angleLabelKo(angle: string): string {
  const map: Record<string, string> = {
    front: "정면",
    "45-degree": "45° 히어로",
    side: "측면",
    detail: "디테일",
    lifestyle: "연출컷",
  };
  return map[angle] ?? angle;
}
