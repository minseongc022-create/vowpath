import type { CompetitorInsight } from "./competitor-research";
import type { DetailCopy } from "./detail-copy";
import type { DesignToolkit } from "./design-toolkit";
import type { ProductAnalysis } from "./product-analysis";
import type { ListingThumbnail } from "./thumbnail-generate";
import type { GeneratedAngle, MatchResult, ScrapedListing } from "./types";

const FALLBACK_TOOLKIT: DesignToolkit = {
  id: "trust",
  label: "트러스트",
  fontStack: '"Pretendard", "Apple SD Gothic Neo", sans-serif',
  bg: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#3182F6",
  accentSoft: "#dbeafe",
  heroGradient: "linear-gradient(135deg, #1d4ed8 0%, #3182F6 100%)",
  radius: "16px",
  sectionTitleStyle: "font-weight:700;",
  featureStyle: "checks",
  moodNote: "범용 — 신뢰 블루",
};

function imgSrc(angle: GeneratedAngle): string {
  if (angle.imageBase64) return `data:image/png;base64,${angle.imageBase64}`;
  if (angle.imageUrl) return angle.imageUrl;
  return "";
}

function thumbSrc(t: ListingThumbnail): string {
  return t.imageBase64 ? `data:image/png;base64,${t.imageBase64}` : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function renderFeatures(copy: DetailCopy | undefined, toolkit: DesignToolkit): string {
  if (!copy?.featureBullets.length) return "";
  if (toolkit.featureStyle === "numbered") {
    return `<ol class="features numbered">${copy.featureBullets
      .map((b, i) => `<li><span class="num">${i + 1}</span>${escapeHtml(b.replace(/^[✓✔]\s*/, ""))}</li>`)
      .join("")}</ol>`;
  }
  if (toolkit.featureStyle === "pills") {
    return `<div class="feature-pills">${copy.featureBullets
      .map((b) => `<span class="pill">${escapeHtml(b.replace(/^[✓✔]\s*/, ""))}</span>`)
      .join("")}</div>`;
  }
  return `<ul class="features checks">${copy.featureBullets
    .map((b) => `<li>${escapeHtml(b.replace(/^[✓✔]\s*/, ""))}</li>`)
    .join("")}</ul>`;
}

export function buildDetailPageHtml(params: {
  listing: ScrapedListing;
  match: MatchResult;
  angles: GeneratedAngle[];
  analysis?: ProductAnalysis;
  copy?: DetailCopy;
  insights?: CompetitorInsight;
  thumbnails?: ListingThumbnail[];
  toolkit?: DesignToolkit;
}): string {
  const { listing, match, angles, analysis, copy, insights, thumbnails } = params;
  const toolkit = params.toolkit ?? FALLBACK_TOOLKIT;
  const title = copy?.headline || analysis?.productNameKo || listing.title || "상품 상세페이지";

  const thumbBlocks = (thumbnails ?? [])
    .filter((t) => thumbSrc(t))
    .map(
      (t) =>
        `<figure class="thumb-card"><img src="${thumbSrc(t)}" alt="${escapeHtml(t.label)}" loading="lazy" /><figcaption>${escapeHtml(t.label)} · ${escapeHtml(t.headline)}</figcaption></figure>`,
    )
    .join("\n");

  const angleBlocks = angles
    .filter((a) => imgSrc(a))
    .map(
      (a) =>
        `<section class="angle-block"><img src="${imgSrc(a)}" alt="${escapeHtml(a.angle)}" loading="lazy" /><p class="angle-cap">${escapeHtml(angleLabelKo(a.angle))}</p></section>`,
    )
    .join("\n");

  const benefitBlocks = copy?.benefitSections
    ?.map(
      (s) =>
        `<article class="benefit"><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.body)}</p></article>`,
    )
    .join("\n");

  const skuNote = match.bestMatch?.skuLabel
    ? `<p class="sku-tag">선택 옵션 · ${escapeHtml(match.bestMatch.skuLabel)}</p>`
    : "";

  const specRows = copy?.specTable
    ?.map((r) => `<tr><th>${escapeHtml(r.label)}</th><td>${escapeHtml(r.value)}</td></tr>`)
    .join("\n");

  const badges = copy?.trustBadges
    ?.map((b) => `<span class="badge">${escapeHtml(b)}</span>`)
    .join("");

  const faqBlocks = copy?.faq
    ?.map(
      (f) =>
        `<details class="faq-item"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`,
    )
    .join("\n");

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
    body {
      font-family: ${toolkit.fontStack};
      background: ${toolkit.bg};
      color: ${toolkit.text};
      line-height: 1.7;
    }
    .wrap { max-width: 860px; margin: 0 auto; padding: 0 0 64px; }
    .hero-banner {
      padding: 56px 28px 44px;
      text-align: center;
      background: ${toolkit.heroGradient};
      color: #fff;
    }
    .toolkit-tag {
      display: inline-block;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 14px;
    }
    .hero-banner h1 {
      font-size: clamp(1.55rem, 4vw, 2.1rem);
      font-weight: 800;
      line-height: 1.3;
      letter-spacing: -0.03em;
    }
    .hero-banner .sub { margin-top: 12px; font-size: 1.05rem; opacity: 0.92; font-weight: 500; }
    .content { padding: 28px 18px; }
    .hook, .story { color: ${toolkit.muted}; margin-bottom: 18px; font-size: 1rem; }
    .sku-tag { font-size: 0.82rem; color: ${toolkit.accent}; font-weight: 600; margin-bottom: 14px; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 28px; }
    .badge {
      padding: 7px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
      background: ${toolkit.accentSoft}; color: ${toolkit.accent};
    }
    .section-title {
      margin: 36px 0 14px;
      color: ${toolkit.text};
      ${toolkit.sectionTitleStyle}
    }
    .section-title.accent { color: ${toolkit.accent}; }
    .features.checks { list-style: none; background: ${toolkit.surface}; border-radius: ${toolkit.radius}; padding: 22px 22px 22px 30px; }
    .features.checks li { position: relative; padding: 7px 0; }
    .features.checks li::before { content: "✓"; position: absolute; left: -20px; color: ${toolkit.accent}; font-weight: 700; }
    .features.numbered { list-style: none; background: ${toolkit.surface}; border-radius: ${toolkit.radius}; padding: 18px; }
    .features.numbered li { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${toolkit.accentSoft}; }
    .features.numbered li:last-child { border-bottom: 0; }
    .features.numbered .num {
      flex: 0 0 28px; height: 28px; border-radius: 999px; background: ${toolkit.accent}; color: #fff;
      display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;
    }
    .feature-pills { display: flex; flex-wrap: wrap; gap: 10px; }
    .feature-pills .pill {
      background: ${toolkit.surface}; border: 1px solid ${toolkit.accentSoft}; color: ${toolkit.text};
      padding: 10px 14px; border-radius: 999px; font-size: 0.88rem; font-weight: 600;
    }
    .benefit-grid { display: grid; gap: 12px; }
    .benefit {
      background: ${toolkit.surface}; border-radius: ${toolkit.radius}; padding: 18px 20px;
      border-left: 3px solid ${toolkit.accent};
    }
    .benefit h3 { font-size: 1rem; margin-bottom: 6px; }
    .benefit p { font-size: 0.92rem; color: ${toolkit.muted}; }
    .thumb-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media (max-width: 640px) { .thumb-grid { grid-template-columns: 1fr; } }
    .thumb-card {
      background: ${toolkit.surface}; border-radius: ${toolkit.radius}; overflow: hidden;
    }
    .thumb-card img { width: 100%; display: block; aspect-ratio: 1; object-fit: cover; }
    .thumb-card figcaption { font-size: 0.72rem; color: ${toolkit.muted}; padding: 8px; text-align: center; }
    .spec-table { width: 100%; border-collapse: collapse; background: ${toolkit.surface}; border-radius: ${toolkit.radius}; overflow: hidden; }
    .spec-table th, .spec-table td { padding: 12px 16px; text-align: left; font-size: 0.9rem; border-bottom: 1px solid ${toolkit.accentSoft}; }
    .spec-table th { width: 34%; color: ${toolkit.muted}; font-weight: 600; background: ${toolkit.bg}; }
    .gallery { display: grid; gap: 14px; }
    .angle-block { background: ${toolkit.surface}; border-radius: ${toolkit.radius}; overflow: hidden; }
    .angle-block img { width: 100%; display: block; }
    .angle-cap { text-align: center; font-size: 0.75rem; color: ${toolkit.muted}; padding: 10px; }
    .ref-image { margin: 18px 0; border-radius: ${toolkit.radius}; overflow: hidden; background: ${toolkit.surface}; }
    .ref-image img { width: 100%; display: block; }
    .faq-item { background: ${toolkit.surface}; border-radius: ${toolkit.radius}; margin-bottom: 8px; padding: 14px 16px; }
    .faq-item summary { font-weight: 600; cursor: pointer; }
    .faq-item p { margin-top: 8px; font-size: 0.88rem; color: ${toolkit.muted}; }
    .cta {
      margin-top: 36px; text-align: center; padding: 26px; border-radius: ${toolkit.radius};
      background: ${toolkit.surface}; font-size: 1.08rem; font-weight: 800; color: ${toolkit.accent};
      border: 1px solid ${toolkit.accentSoft};
    }
    .footer { margin-top: 40px; text-align: center; font-size: 0.7rem; color: ${toolkit.muted}; opacity: 0.8; }
    .insight-section {
      margin-top: 28px; padding: 18px; border-radius: ${toolkit.radius};
      border: 1px dashed ${toolkit.accentSoft}; background: ${toolkit.surface};
    }
    .insight-note { font-size: 0.78rem; color: ${toolkit.muted}; margin-bottom: 8px; }
    .insight-list { padding-left: 18px; font-size: 0.88rem; color: ${toolkit.muted}; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero-banner">
      <div class="toolkit-tag">${escapeHtml(toolkit.label)} · ${escapeHtml(toolkit.moodNote)}</div>
      <h1>${escapeHtml(title)}</h1>
      ${copy?.subheadline ? `<p class="sub">${escapeHtml(copy.subheadline)}</p>` : ""}
    </header>
    <div class="content">
      ${skuNote}
      ${copy?.hookParagraph ? `<p class="hook">${escapeHtml(copy.hookParagraph)}</p>` : `<p class="hook">${escapeHtml(match.referenceDescription)}</p>`}
      ${copy?.storyParagraph ? `<p class="story">${escapeHtml(copy.storyParagraph)}</p>` : ""}
      ${badges ? `<div class="badges">${badges}</div>` : ""}

      ${thumbBlocks ? `<h2 class="section-title accent">마켓 썸네일 (3종)</h2><div class="thumb-grid">${thumbBlocks}</div>` : ""}

      ${copy?.featureBullets?.length ? `<h2 class="section-title accent">핵심 포인트</h2>${renderFeatures(copy, toolkit)}` : ""}

      ${benefitBlocks ? `<h2 class="section-title accent">왜 선택해야 할까요</h2><div class="benefit-grid">${benefitBlocks}</div>` : ""}

      ${matchedUrl ? `<div class="ref-image"><img src="${matchedUrl}" alt="매칭 상품" loading="lazy" /></div>` : ""}

      ${angleBlocks ? `<h2 class="section-title accent">상품 상세컷</h2><div class="gallery">${angleBlocks}</div>` : ""}

      ${specRows ? `<h2 class="section-title accent">상품 정보</h2><table class="spec-table"><tbody>${specRows}</tbody></table>` : ""}

      ${faqBlocks ? `<h2 class="section-title accent">자주 묻는 질문</h2>${faqBlocks}` : ""}

      ${
        insights?.commonStrengths?.length
          ? `<section class="insight-section"><p class="insight-note">경쟁 분석 · ${escapeHtml(insights.searchQuery)}</p><ul class="insight-list">${insights.commonStrengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul></section>`
          : ""
      }

      ${copy?.ctaLine ? `<div class="cta">${escapeHtml(copy.ctaLine)}</div>` : ""}
      <p class="footer">MatchCut · ${escapeHtml(toolkit.id)} toolkit · ${escapeHtml(listing.url)}</p>
    </div>
  </div>
</body>
</html>`;
}
