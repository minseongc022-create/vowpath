/**
 * 프리미엄 상세페이지 템플릿 — 후커블·드랩급 레이아웃
 *
 * ★ 상세페이지가 "고급스러워 보이는" 실제 요인은 셋이다:
 *  1) **컷 수와 역할 분담** — 히어로·디테일·사용맥락·크기가늠이 순서대로 오면
 *     "제대로 촬영한 브랜드"로 읽힌다. 원본 1장만 붙이면 도매 티가 난다.
 *  2) **여백과 타이포 위계** — 정보를 빽빽이 채우는 게 아니라, 섹션마다
 *     숨 쉴 공간을 준다. 한국 상세페이지가 촌스러워지는 1순위 원인이 여백 부족.
 *  3) **카테고리에 맞는 톤** — 식품과 디지털이 같은 색·같은 문구면 둘 다 어색하다.
 *
 * ★ 문구는 상품에서 나온 사실만 쓴다.
 * "최고급", "업계 1위" 같은 근거 없는 최상급 표현은 넣지 않는다 — 토스 정책상
 * 실증 없는 최상급·배타성 표현은 제재 대상이고(toss-policy-engine 참조),
 * 무엇보다 위탁판매는 실물을 검증할 수 없어 과장이 곧 허위표시가 된다.
 */

import type { TossShopCategory } from "../types";
import type { ProductShot } from "./product-shot-set";

export const PREMIUM_DETAIL_VERSION = "1.0";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 카테고리별 톤 — 색·헤드라인 문구만 다르게, 레이아웃은 공통 */
type CategoryTone = {
  accent: string;
  accentSoft: string;
  accentInk: string;
  heroTag: string;
  whyHeading: string;
  storyHeading: string;
};

const TONES: Record<TossShopCategory, CategoryTone> = {
  food: {
    accent: "#c2410c", accentSoft: "#fff7ed", accentInk: "#7c2d12",
    heroTag: "오늘의 식탁", whyHeading: "이 상품을 고른 이유", storyHeading: "이렇게 즐기세요",
  },
  beauty: {
    accent: "#be185d", accentSoft: "#fdf2f8", accentInk: "#831843",
    heroTag: "데일리 뷰티", whyHeading: "이런 분께 맞습니다", storyHeading: "사용 방법",
  },
  home: {
    accent: "#0f766e", accentSoft: "#f0fdfa", accentInk: "#134e4a",
    heroTag: "생활을 바꾸는 선택", whyHeading: "이 상품의 장점", storyHeading: "이렇게 쓰입니다",
  },
  digital: {
    accent: "#1d4ed8", accentSoft: "#eff6ff", accentInk: "#1e3a8a",
    heroTag: "스마트한 선택", whyHeading: "핵심 스펙", storyHeading: "이렇게 활용하세요",
  },
  fashion: {
    accent: "#4338ca", accentSoft: "#eef2ff", accentInk: "#312e81",
    heroTag: "이번 시즌", whyHeading: "스타일 포인트", storyHeading: "코디 제안",
  },
  health: {
    accent: "#15803d", accentSoft: "#f0fdf4", accentInk: "#14532d",
    heroTag: "건강한 하루", whyHeading: "이런 점이 좋습니다", storyHeading: "이렇게 챙기세요",
  },
};

function toneFor(c?: TossShopCategory): CategoryTone {
  return (c && TONES[c]) || TONES.home;
}

export type PremiumDetailInput = {
  title: string;
  keyword: string;
  priceKrw: number;
  originPriceKrw?: number;
  category?: TossShopCategory;
  sellingPoints: string[];
  description: string;
  /** 멀티컷 세트 (product-shot-set). 없으면 원본 이미지 배열로 폴백 */
  shots?: ProductShot[];
  fallbackImages?: string[];
  supplierLabel?: string;
  /** 배송 안내 — 오늘출발 여부 등 사실만 */
  deliveryNote?: string;
  /** 교환·반품 안내 — 공급처 정책에서 판독된 사실만 */
  returnNote?: string;
};

function galleryHtml(input: PremiumDetailInput, tone: CategoryTone): string {
  const shots = input.shots ?? [];
  const fallback = input.fallbackImages ?? [];

  // 멀티컷이 있으면 캡션과 함께, 없으면 원본 이미지들로
  const items = shots.length
    ? shots.map((s) => ({ url: s.url, caption: s.caption }))
    : fallback.map((u) => ({ url: u, caption: "" }));

  if (!items.length) return "";

  const [hero, ...rest] = items;
  const restHtml = rest
    .map(
      (it) => `
      <figure class="shot">
        <img src="${escapeHtml(it.url)}" alt="${escapeHtml(input.title)}" loading="lazy" />
        ${it.caption ? `<figcaption>${escapeHtml(it.caption)}</figcaption>` : ""}
      </figure>`,
    )
    .join("");

  return `
    <section class="gallery">
      <figure class="hero-shot">
        <img src="${escapeHtml(hero.url)}" alt="${escapeHtml(input.title)}" />
      </figure>
      ${restHtml ? `<div class="shots">${restHtml}</div>` : ""}
    </section>`;
}

function pointsHtml(points: string[], tone: CategoryTone): string {
  return points
    .slice(0, 5)
    .map(
      (p, i) => `
      <li class="point">
        <span class="point-no">${String(i + 1).padStart(2, "0")}</span>
        <p>${escapeHtml(p)}</p>
      </li>`,
    )
    .join("");
}

function storyHtml(description: string): string {
  const paras = description
    .split(/(?<=[.!?。])\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1)
    .slice(0, 5);
  if (!paras.length) return `<p>${escapeHtml(description.slice(0, 400))}</p>`;
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

export function buildPremiumDetailHtml(input: PremiumDetailInput): string {
  const tone = toneFor(input.category);
  const discountPct =
    input.originPriceKrw && input.originPriceKrw > input.priceKrw
      ? Math.round(((input.originPriceKrw - input.priceKrw) / input.originPriceKrw) * 100)
      : 0;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      --accent: ${tone.accent};
      --accent-soft: ${tone.accentSoft};
      --accent-ink: ${tone.accentInk};
      --ink: #18181b;
      --muted: #71717a;
      --line: #e4e4e7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", sans-serif;
      background: #fff; color: var(--ink); line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }
    .page { max-width: 780px; margin: 0 auto; }

    /* 히어로 — 여백을 넉넉히 줘서 도매 상세 특유의 빽빽함을 없앤다 */
    .hero { padding: 56px 28px 44px; text-align: center; border-bottom: 1px solid var(--line); }
    .hero .tag {
      display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.14em;
      color: var(--accent); background: var(--accent-soft);
      padding: 7px 14px; border-radius: 999px; margin-bottom: 20px;
    }
    .hero h1 { font-size: 1.6rem; font-weight: 800; line-height: 1.45; letter-spacing: -0.02em; }
    .hero .price-row { margin-top: 22px; display: flex; align-items: baseline; justify-content: center; gap: 10px; flex-wrap: wrap; }
    .hero .price { font-size: 1.9rem; font-weight: 900; letter-spacing: -0.03em; }
    .hero .price small { font-size: 0.95rem; font-weight: 600; margin-left: 2px; }
    .hero .origin { font-size: 1rem; color: var(--muted); text-decoration: line-through; }
    .hero .off { font-size: 0.95rem; font-weight: 800; color: var(--accent); }

    /* 갤러리 — 히어로컷은 크게, 나머지는 캡션과 함께 그리드 */
    .gallery { background: #fafafa; }
    .hero-shot img { width: 100%; display: block; }
    .shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1px; background: var(--line); }
    .shot { background: #fff; }
    .shot img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
    .shot figcaption {
      font-size: 0.75rem; color: var(--muted); text-align: center;
      padding: 10px 8px 14px; font-weight: 600;
    }

    section.block { padding: 48px 28px; }
    section.block + section.block { border-top: 1px solid var(--line); }
    .block h2 {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em;
      color: var(--accent); text-transform: uppercase; margin-bottom: 8px;
    }
    .block .lead { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 26px; }

    /* 핵심 포인트 — 번호를 크게 줘서 스캔이 쉽게 */
    .points { list-style: none; display: grid; gap: 2px; }
    .point { display: flex; gap: 18px; align-items: flex-start; padding: 20px 4px; border-bottom: 1px solid var(--line); }
    .point:last-child { border-bottom: 0; }
    .point-no { font-size: 0.8rem; font-weight: 900; color: var(--accent); flex-shrink: 0; padding-top: 3px; letter-spacing: 0.04em; }
    .point p { font-size: 1rem; font-weight: 600; }

    .story p { font-size: 0.98rem; color: #3f3f46; margin-bottom: 14px; }
    .story p:last-child { margin-bottom: 0; }

    /* 안내 — 배송·반품은 사실만, 눈에 띄게 */
    .info-grid { display: grid; gap: 12px; }
    .info-item { background: var(--accent-soft); border-radius: 14px; padding: 18px 20px; }
    .info-item dt { font-size: 0.78rem; font-weight: 800; color: var(--accent-ink); margin-bottom: 6px; letter-spacing: 0.02em; }
    .info-item dd { font-size: 0.92rem; color: #3f3f46; }

    .foot { font-size: 0.72rem; color: #a1a1aa; padding: 28px; text-align: center; border-top: 1px solid var(--line); }

    @media (max-width: 480px) {
      .hero { padding: 40px 20px 32px; }
      .hero h1 { font-size: 1.35rem; }
      section.block { padding: 36px 20px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="hero">
      <span class="tag">${escapeHtml(tone.heroTag)}</span>
      <h1>${escapeHtml(input.title)}</h1>
      <div class="price-row">
        ${discountPct > 0 ? `<span class="off">${discountPct}%</span>` : ""}
        <span class="price">${input.priceKrw.toLocaleString()}<small>원</small></span>
        ${discountPct > 0 ? `<span class="origin">${input.originPriceKrw!.toLocaleString()}원</span>` : ""}
      </div>
    </header>

    ${galleryHtml(input, tone)}

    <section class="block">
      <h2>Why</h2>
      <p class="lead">${escapeHtml(tone.whyHeading)}</p>
      <ul class="points">${pointsHtml(input.sellingPoints, tone)}</ul>
    </section>

    <section class="block story">
      <h2>About</h2>
      <p class="lead">${escapeHtml(tone.storyHeading)}</p>
      ${storyHtml(input.description)}
    </section>

    <section class="block">
      <h2>Guide</h2>
      <p class="lead">구매 전 확인해주세요</p>
      <dl class="info-grid">
        <div class="info-item">
          <dt>배송</dt>
          <dd>${escapeHtml(input.deliveryNote ?? "결제 확인 후 순차 발송됩니다.")}</dd>
        </div>
        <div class="info-item">
          <dt>교환 · 반품</dt>
          <dd>${escapeHtml(input.returnNote ?? "수령 후 7일 이내 신청 가능합니다. 단순 변심의 경우 왕복 배송비가 부과될 수 있습니다.")}</dd>
        </div>
      </dl>
    </section>

    <p class="foot">${input.supplierLabel ? `${escapeHtml(input.supplierLabel)} · ` : ""}${escapeHtml(input.keyword)}</p>
  </div>
</body>
</html>`;
}
