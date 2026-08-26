/**
 * Multi-provider AI 상세페이지 — Hookable/Draph/SellerBiseo API → Matchcut → OpenAI Premium → Local
 *
 * 외부 SaaS API 키 있으면 우선, 없으면 OpenAI 프리미엄(저렴·고품질), 최종 Hookable 로컬.
 */

import type { ConsignmentPick, ImportPick } from "../types";
import {
  buildHookableDetailFromPick,
  buildHookableDetailHtml,
  type HookableDetailInput,
} from "./hookable-detail-engine";
import { fetchWholesaleProductImages } from "./wholesale-image-fetch";
import { requestMatchcutDetailPage, type MatchcutRequest } from "./matchcut-adapter";

export const DETAIL_PROVIDERS_VERSION = "1.0";

export type DetailPageProviderId =
  | "hookable_api"
  | "draph"
  | "sellerbiseo"
  | "matchcut_pipeline"
  | "openai_premium"
  | "hookable_local";

export type DetailPageProviderResult = {
  status: "ready" | "deferred";
  html?: string;
  thumbnailUrl?: string;
  generatedImages?: string[];
  provider: DetailPageProviderId;
  costEstimateKrw?: number;
  note?: string;
};

type ExternalProviderConfig = {
  id: DetailPageProviderId;
  apiUrl?: string;
  apiKey?: string;
  costKrw: number;
};

function externalProviders(): ExternalProviderConfig[] {
  return [
    {
      id: "draph",
      apiUrl: process.env.DRAPH_API_URL?.trim(),
      apiKey: process.env.DRAPH_API_KEY?.trim(),
      costKrw: 800,
    },
    {
      id: "hookable_api",
      apiUrl: process.env.HOOKABLE_API_URL?.trim(),
      apiKey: process.env.HOOKABLE_API_KEY?.trim(),
      costKrw: 990,
    },
    {
      id: "sellerbiseo",
      apiUrl: process.env.SELLERBISEO_API_URL?.trim(),
      apiKey: process.env.SELLERBISEO_API_KEY?.trim(),
      costKrw: 850,
    },
  ].filter((p) => p.apiUrl && p.apiKey) as ExternalProviderConfig[];
}

type ProviderPayload = {
  title: string;
  keyword: string;
  priceKrw: number;
  sellingPoints: string[];
  description: string;
  images: string[];
  productUrl?: string;
};

async function fetchExternalDetail(
  config: ExternalProviderConfig,
  payload: ProviderPayload,
): Promise<DetailPageProviderResult | null> {
  if (!config.apiUrl || !config.apiKey) return null;
  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "X-Provider": config.id,
      },
      body: JSON.stringify({
        title: payload.title,
        keyword: payload.keyword,
        price: payload.priceKrw,
        sellingPoints: payload.sellingPoints,
        description: payload.description,
        images: payload.images,
        productUrl: payload.productUrl,
        platform: "toss",
        format: "html",
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      html?: string;
      detailHtml?: string;
      thumbnailUrl?: string;
      thumbnail?: string;
      images?: string[];
    };
    const html = json.html ?? json.detailHtml;
    if (!html?.trim()) return null;
    return {
      status: "ready",
      html,
      thumbnailUrl: json.thumbnailUrl ?? json.thumbnail ?? payload.images[0],
      generatedImages: json.images ?? payload.images,
      provider: config.id,
      costEstimateKrw: config.costKrw,
    };
  } catch {
    return null;
  }
}

async function buildOpenAiPremiumDetail(
  input: HookableDetailInput,
  category: string,
): Promise<DetailPageProviderResult | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  // 도매매 원본 사진을 후커블급으로 업그레이드 — 실패하면 원본 그대로 진행한다
  // (이미지 생성은 부가 개선일 뿐, 실패로 상세페이지 생성 자체를 막지 않는다)
  const { upgradeDetailImages } = await import("./ai-image-studio");
  const upgraded = await upgradeDetailImages({
    heroImageUrl: input.images[0],
    category,
    productLabel: input.title,
    sellingPoints: input.sellingPoints,
  });
  const heroImage = upgraded.heroUrl ?? input.images[0];
  const galleryImages = upgraded.heroUrl ? [upgraded.heroUrl, ...input.images.slice(1)] : input.images;
  const badgeLines = upgraded.badges
    .map((b) => `  - "${b.text}" 배지 이미지: ${b.url}`)
    .join("\n");

  const prompt = `토스쇼핑 프리미um 상세페이지 HTML을 생성하세요. Hookable/Draph보다 전환율 높은 레이아웃.

상품: ${input.title}
키워드: ${input.keyword}
가격: ${input.priceKrw.toLocaleString()}원
셀링포인트: ${input.sellingPoints.join(" / ")}
설명: ${input.description.slice(0, 600)}
이미지 URL (${galleryImages.length}개): ${galleryImages.slice(0, 6).join(", ")}
히어로 이미지(AI 배경 재구성 여부: ${upgraded.heroUrl ? "완료 — 이 URL을 히어로로 사용" : "없음 — 원본 사용"}): ${heroImage}
${upgraded.badges.length ? `AI 생성 셀링포인트 배지 이미지:\n${badgeLines}` : ""}

요구사항:
- 완전한 <!DOCTYPE html> 단일 파일
- 모바일 최적, Pretendard 폰트
- 히어로(위 히어로 이미지 URL 사용) → 갤러리(img src 그대로) → 혜택 5개(배지 이미지가 있으면 아이콘 대신 배지 이미지 사용) → 스토리 → 신뢰 배지
- 인라인 CSS만, JS 없음
- 한국어`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // 상세페이지는 문장력·설득력이 실제 전환율에 영향을 준다.
        // 카테고리 매칭(기계적 분류)과 달리 여기는 더 좋은 모델을 쓸
        // 값어치가 있어서 별도 환경변수로 분리했다 — JARVIS_OPENAI_MODEL을
        // 그대로 두고 여기만 올리고 싶을 때를 위해서다.
        model:
          process.env.JARVIS_DETAIL_OPENAI_MODEL ?? process.env.JARVIS_OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let html = json.choices?.[0]?.message?.content?.trim() ?? "";
    html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "");
    if (!html.includes("<html")) {
      html = buildHookableDetailHtml(input);
    }
    return {
      status: "ready",
      html,
      thumbnailUrl: heroImage,
      generatedImages: galleryImages,
      provider: "openai_premium",
      costEstimateKrw: upgraded.heroUrl || upgraded.badges.length ? 150 + 40 * (1 + upgraded.badges.length) : 150,
    };
  } catch {
    return null;
  }
}

async function buildProviderPayload(
  pick: ConsignmentPick | ImportPick,
  mode: "consignment" | "import",
  sellingPoints: string[],
): Promise<ProviderPayload> {
  const title = pick.suggestedTitle ?? pick.productName;
  const wholesale = mode === "consignment" && "wholesaleBest" in pick ? pick.wholesaleBest : null;
  const importBest = mode === "import" && "importBest" in pick ? pick.importBest : null;
  const productUrl = wholesale?.url ?? importBest?.url;
  const primaryImage = wholesale?.imageUrl ?? importBest?.imageUrl;
  const images = await fetchWholesaleProductImages({
    productUrl,
    primaryImageUrl: primaryImage,
    maxImages: 8,
  });
  const description =
    (pick.aiSummary ?? "").slice(0, 1200) ||
    `${title} — ${pick.keyword} Jarvis 검증 SKU. ${sellingPoints.join(". ")}.`;
  return {
    title,
    keyword: pick.keyword,
    priceKrw: pick.recommendedPriceKrw,
    sellingPoints,
    description,
    images,
    productUrl,
  };
}

export function listActiveDetailProviders(): Array<{ id: DetailPageProviderId; costKrw: number }> {
  const list: Array<{ id: DetailPageProviderId; costKrw: number }> = externalProviders().map((p) => ({
    id: p.id,
    costKrw: p.costKrw,
  }));
  if (process.env.OPENAI_API_KEY?.trim()) {
    list.push({ id: "openai_premium", costKrw: 150 });
  }
  list.push({ id: "hookable_local", costKrw: 0 });
  return list;
}

export async function requestDetailPageFromProviders(
  matchcutInput: MatchcutRequest,
): Promise<DetailPageProviderResult> {
  const payload = await buildProviderPayload(
    matchcutInput.pick,
    matchcutInput.mode,
    matchcutInput.sellingPoints,
  );

  for (const provider of externalProviders()) {
    const result = await fetchExternalDetail(provider, payload);
    if (result?.status === "ready") return result;
  }

  const matchcut = await requestMatchcutDetailPage(matchcutInput);
  if (matchcut.status === "ready") {
    return {
      status: "ready",
      html: matchcut.html,
      thumbnailUrl: matchcut.thumbnailUrl,
      generatedImages: matchcut.generatedImages,
      provider: matchcut.source === "matchcut_pipeline" ? "matchcut_pipeline" : "hookable_local",
      costEstimateKrw: matchcut.source === "matchcut_pipeline" ? 0 : 0,
    };
  }

  const hookableInput: HookableDetailInput = {
    title: payload.title,
    keyword: payload.keyword,
    priceKrw: payload.priceKrw,
    sellingPoints: payload.sellingPoints,
    description: payload.description,
    images: payload.images,
    brandLabel: "Jarvis Pick",
  };

  const openAi = await buildOpenAiPremiumDetail(hookableInput, matchcutInput.pick.category);
  if (openAi?.status === "ready") return openAi;

  try {
    const local = await buildHookableDetailFromPick(
      matchcutInput.pick,
      matchcutInput.mode,
      matchcutInput.sellingPoints,
    );
    return {
      status: "ready",
      html: local.html,
      thumbnailUrl: local.thumbnailUrl,
      generatedImages: local.images,
      provider: "hookable_local",
      costEstimateKrw: 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DETAIL_FAIL";
    return {
      status: "deferred",
      provider: "hookable_local",
      note: matchcut.status === "deferred" ? matchcut.note : msg,
    };
  }
}
