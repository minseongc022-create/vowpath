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
  /** 사람이 외부 툴(후커블·드랩아트 등)에서 만들어 반입한 것 */
  | "manual_import"
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

/**
 * ⚠️ 외부 SaaS 직접 호출은 제거했다.
 *
 * 종전 코드는 후커블·드랩아트·셀러비서가 **모두 같은 REST 스펙**(Bearer 인증 +
 * {title, keyword, price, images} → {html})을 쓴다고 가정하고 호출했다.
 * 그런 근거는 없었고, 확인해 보니 세 곳 다 공개 개발자 API 자체가 확인되지
 * 않는다 (근거는 detail-page-sources.ts에 정리).
 *
 * 게다가 호출부가 오류를 통째로 삼켜서, 키를 넣어도 조용히 실패하고 다음
 * 폴백으로 넘어갔다 — 연동이 안 된다는 사실조차 남지 않았다.
 *
 * 그래서 이제 이 자리는 두 갈래다:
 *   · 실제로 계약된 API가 생기면 그때 진짜 스펙으로 어댑터를 구현한다
 *   · 그 전까지 고품질이 필요하면 **반입(detail-page-import.ts)**을 쓴다
 */

type ProviderPayload = {
  title: string;
  keyword: string;
  priceKrw: number;
  sellingPoints: string[];
  description: string;
  images: string[];
  productUrl?: string;
};

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

/** 지금 실제로 쓸 수 있는 경로만 — 연동 안 된 SaaS는 여기 나오지 않는다 */
export function listActiveDetailProviders(): Array<{ id: DetailPageProviderId; costKrw: number }> {
  const list: Array<{ id: DetailPageProviderId; costKrw: number }> = [];
  if (process.env.OPENAI_API_KEY?.trim()) {
    list.push({ id: "openai_premium", costKrw: 150 });
  }
  list.push({ id: "hookable_local", costKrw: 0 });
  return list;
}

/**
 * 상세페이지를 만든다.
 *
 * `importedDetail`이 주어지면 그것을 최우선으로 쓴다 — 사람이 외부 툴에서
 * 만든 고품질 결과이므로, 자체 생성으로 덮어쓸 이유가 없다.
 * 없으면 자체 생성 경로(Matchcut → OpenAI → 로컬)로 내려간다.
 */
export async function requestDetailPageFromProviders(
  matchcutInput: MatchcutRequest,
  /** 외부 툴에서 반입한 상세페이지 (detail-page-import.ts가 검수를 마친 것) */
  importedDetail?: { html: string; thumbnailUrl?: string; images?: string[] },
): Promise<DetailPageProviderResult> {
  const payload = await buildProviderPayload(
    matchcutInput.pick,
    matchcutInput.mode,
    matchcutInput.sellingPoints,
  );

  // 사람이 외부 툴로 만든 것이 있으면 그게 최우선이다
  if (importedDetail?.html?.trim()) {
    return {
      status: "ready",
      html: importedDetail.html,
      thumbnailUrl: importedDetail.thumbnailUrl ?? payload.images[0],
      generatedImages: importedDetail.images ?? payload.images,
      provider: "manual_import",
      costEstimateKrw: 0,
      note: "외부 툴 반입 상세페이지 — 검수 통과",
    };
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
