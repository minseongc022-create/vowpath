/**
 * Jarvis AI 이미지 스튜디오 — 도매매 원본 사진을 후커블급으로 업그레이드
 *
 * 후커블/드랩의 핵심 격차는 카피가 아니라 **이미지 처리**다: 배경 재구성,
 * 셀링포인트를 시각화한 인포그래픽 배지. 텍스트 생성(OpenAI Chat)과 이미지
 * 생성(OpenAI Images)은 별도 API라서, 지금까지는 도매매 원본 사진을 그대로
 * 붙이기만 했다. 이 모듈이 그 격차를 메운다.
 *
 * 설계 원칙:
 *  1) 실패해도 상품 등록이 막히면 안 된다 — 모든 함수는 실패 시 null을 반환하고,
 *     호출부가 원본 이미지로 폴백한다.
 *  2) 상품 자체를 왜곡하면 안 된다 — 배경 재구성 프롬프트는 "제품은 그대로,
 *     배경만 교체"를 명시한다. 상품과 다르게 보이면 그게 사기다.
 *  3) 비용은 통제 가능해야 한다 — 상세페이지당 배지 최대 3장, env로 끌 수 있다.
 */

export const AI_IMAGE_STUDIO_VERSION = "1.0";

const IMAGE_MODEL = () => process.env.JARVIS_IMAGE_MODEL?.trim() || "gpt-image-1";
const IMAGE_SIZE = () => process.env.JARVIS_IMAGE_SIZE?.trim() || "1024x1024";
const MAX_BADGES = 3;

export function aiImagesEnabled(): boolean {
  if (!process.env.OPENAI_API_KEY?.trim()) return false;
  // 기본 ON — 비용이 부담되면 명시적으로 끌 수 있게
  return process.env.JARVIS_AI_IMAGES !== "false";
}

type CategoryScene = { ko: string; sceneEn: string };

/** 배경을 실제 생활공간으로 바꾸는 라이프스타일 컷 (판매 맥락 전달용, style: "lifestyle") */
const CATEGORY_LIFESTYLE_SCENES: Record<string, CategoryScene> = {
  food: { ko: "식탁", sceneEn: "a clean modern kitchen table with soft natural daylight" },
  beauty: { ko: "화장대", sceneEn: "a minimal beige vanity table with soft studio lighting" },
  home: { ko: "거실", sceneEn: "a bright minimal living room interior" },
  digital: { ko: "데스크", sceneEn: "a clean modern desk setup with soft gradient background" },
  fashion: { ko: "스튜디오", sceneEn: "a soft neutral studio backdrop with editorial lighting" },
  health: { ko: "웰니스", sceneEn: "a calm minimal wellness setting with plants and soft light" },
};

/**
 * 진짜 스튜디오 촬영처럼 보이게 하는 배경톤 (기본값, style: "studio").
 * 카테고리별로 배경색 톤만 살짝 다르게 — 나머지 조명·구도는 전문 제품
 * 촬영 공통 규칙(seamless backdrop·softbox·바닥 반사광)으로 통일한다.
 */
const CATEGORY_STUDIO_TONES: Record<string, string> = {
  food: "warm neutral beige seamless studio backdrop",
  beauty: "soft blush pink seamless studio backdrop",
  home: "cool light gray seamless studio backdrop",
  digital: "dark charcoal gradient seamless studio backdrop",
  fashion: "clean white seamless studio backdrop",
  health: "soft sage green seamless studio backdrop",
};

export type ImageStyle = "studio" | "lifestyle";

function lifestyleSceneFor(category: string): CategoryScene {
  return CATEGORY_LIFESTYLE_SCENES[category] ?? CATEGORY_LIFESTYLE_SCENES.home;
}

/**
 * 실제 제품 촬영 스튜디오에서 쓰는 표준 조명·구도 문구.
 * "AI가 그린 티" 대신 커머스 카탈로그 사진 특유의 질감(소프트박스 반사,
 * 바닥 그라데이션 반사광, 살짝의 비네팅)을 명시적으로 지시한다.
 */
function studioPromptFor(category: string): string {
  const tone = CATEGORY_STUDIO_TONES[category] ?? CATEGORY_STUDIO_TONES.home;
  return (
    `professional e-commerce product photography studio shot, ${tone}, ` +
    `large softbox key light from upper-left with a subtle fill light, ` +
    `soft realistic floor reflection/gradient shadow beneath the product, ` +
    `sharp focus on the product, shallow depth of field on the backdrop, ` +
    `catalog-quality lighting like a professional studio photoshoot, no props, no text, no watermark`
  );
}

async function fetchImageAsPngBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 500 || ab.byteLength > 10 * 1024 * 1024) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

/**
 * 원본 상품 사진의 배경을 카테고리에 맞는 라이프스타일 씬으로 재구성한다.
 * 제품 자체는 바꾸지 않도록 프롬프트에 명시한다 (허위 표시 방지).
 */
export async function regenerateProductBackground(input: {
  imageUrl: string;
  category: string;
  productLabel: string;
  style?: ImageStyle;
  /**
   * 컷별 촬영 지시 (product-shot-set.ts). 조명·구도·거리만 바꾸는 지시여야 한다 —
   * 상품을 회전시키거나 안 보이던 면을 만들라는 지시는 넣으면 안 된다.
   */
  directive?: string;
}): Promise<{ url: string } | null> {
  if (!aiImagesEnabled()) return null;
  const apiKey = process.env.OPENAI_API_KEY!.trim();

  const original = await fetchImageAsPngBuffer(input.imageUrl);
  if (!original) return null;

  const style = input.style ?? "studio";
  const backdrop =
    style === "studio"
      ? studioPromptFor(input.category)
      : `the product placed naturally in ${lifestyleSceneFor(input.category).sceneEn}`;

  // 형태 보존 제약은 모든 컷에 공통으로 강하게 건다.
  //
  // 이 제약이 느슨하면 모델이 "더 예쁘게" 만들려고 상품을 손본다 — 로고를
  // 다시 그리거나, 라벨 문구를 바꾸거나, 비율을 미화한다. 그 이미지를 보고 산
  // 고객은 다른 물건을 받는다(반품·분쟁·허위표시). 위탁은 실물 검증이
  // 불가능하므로 프롬프트 제약이 유일한 안전장치다.
  const PRESERVE =
    `CRITICAL CONSTRAINT: the product itself (${input.productLabel}) must remain byte-for-byte faithful to the input image. ` +
    `Do not rotate it, do not show any side or surface that is not already visible in the input, ` +
    `do not invent or redraw logos, labels, text, patterns, buttons, ports, or finishes. ` +
    `Preserve exact shape, proportions, colors, materials, and every existing marking. ` +
    `You may only change lighting, background, camera distance and framing.`;

  const prompt =
    `Re-photograph this existing product without altering the product. New background: ${backdrop}. ` +
    `${input.directive ?? "Keep the same viewing side; re-light as a clean studio product shot."} ` +
    `${PRESERVE} ` +
    `Photorealistic, high-resolution, professional e-commerce product photography, no added text or watermark.`;

  try {
    const form = new FormData();
    form.append("model", IMAGE_MODEL());
    form.append("prompt", prompt);
    form.append("size", IMAGE_SIZE());
    form.append("image", new Blob([new Uint8Array(original)], { type: "image/png" }), "product.png");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return null;

    const { saveAiImage } = await import("../ai-image-store");
    const saved = await saveAiImage(b64);
    if ("error" in saved) return null;
    return { url: saved.url };
  } catch {
    return null;
  }
}

export type SellingPointBadge = { text: string; url: string };

/**
 * 셀링포인트를 인포그래픽 배지 이미지로 만든다 (예: "당일발송" → 배지 아이콘).
 * 비용 통제를 위해 최대 3개까지만 생성한다.
 */
export async function generateSellingPointBadges(input: {
  sellingPoints: string[];
  brandColor?: string;
}): Promise<SellingPointBadge[]> {
  if (!aiImagesEnabled()) return [];
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const points = input.sellingPoints.filter(Boolean).slice(0, MAX_BADGES);
  if (!points.length) return [];

  const { saveAiImage } = await import("../ai-image-store");
  const results: SellingPointBadge[] = [];

  for (const point of points) {
    const prompt =
      `A minimal flat-design e-commerce infographic badge icon representing "${point}". ` +
      `Simple geometric icon, no text, no letters, no watermark, centered on a transparent-looking white background, ` +
      `soft pastel color palette, modern app icon style, high contrast, clean vector look.`;

    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL(),
          prompt,
          size: "1024x1024",
          n: 1,
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) continue;

      const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) continue;

      const saved = await saveAiImage(b64);
      if ("error" in saved) continue;
      results.push({ text: point, url: saved.url });
    } catch {
      continue;
    }
  }

  return results;
}

/**
 * 상세페이지용 이미지 업그레이드 일괄 처리.
 * 실패한 항목은 조용히 빠지고, 성공한 것만 반환한다 — 원본 폴백은 호출부 책임.
 */
export async function upgradeDetailImages(input: {
  heroImageUrl?: string;
  category: string;
  productLabel: string;
  sellingPoints: string[];
  /** 기본 "studio" — 진짜 스튜디오 촬영처럼. "lifestyle"은 생활공간 합성컷 */
  style?: ImageStyle;
}): Promise<{ heroUrl: string | null; badges: SellingPointBadge[] }> {
  if (!aiImagesEnabled()) return { heroUrl: null, badges: [] };

  const [hero, badges] = await Promise.all([
    input.heroImageUrl
      ? regenerateProductBackground({
          imageUrl: input.heroImageUrl,
          category: input.category,
          productLabel: input.productLabel,
          style: input.style,
        })
      : Promise.resolve(null),
    generateSellingPointBadges({ sellingPoints: input.sellingPoints }),
  ]);

  return { heroUrl: hero?.url ?? null, badges };
}
