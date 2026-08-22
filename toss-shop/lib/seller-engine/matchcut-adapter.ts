/**
 * Matchcut 연동 어댑터 — detail-page-providers에서 호출
 */

import { isSupportedListingUrl } from "@/lib/sourcing-detail/platforms";
import { runSourcingPipeline } from "@/lib/sourcing-detail/pipeline";
import type { ConsignmentPick, ImportPick } from "../types";
import { buildHookableDetailFromPick } from "./hookable-detail-engine";
import { fetchUrlAsBase64 } from "./wholesale-image-fetch";

export const MATCHCUT_ADAPTER_VERSION = "2.0";

export type MatchcutRequest = {
  listingUrl?: string;
  referenceImageUrl?: string;
  referenceImageBase64?: string;
  keyword: string;
  productName: string;
  pick: ConsignmentPick | ImportPick;
  mode: "consignment" | "import";
  sellingPoints: string[];
  generateAngles?: boolean;
};

export type MatchcutResult =
  | { status: "deferred"; note: string }
  | {
      status: "ready";
      html: string;
      thumbnailUrl?: string;
      generatedImages: string[];
      source: "matchcut_pipeline" | "hookable";
    };

export function isMatchcutEnabled(): boolean {
  return process.env.JARVIS_MATCHCUT_ENABLED !== "false";
}

function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function requestMatchcutDetailPage(
  input: MatchcutRequest,
): Promise<MatchcutResult> {
  if (!isMatchcutEnabled()) {
    return {
      status: "deferred",
      note: "Matchcut 비활성 — JARVIS_MATCHCUT_ENABLED=false",
    };
  }

  const listingUrl = input.listingUrl?.trim();
  const refUrl = input.referenceImageUrl?.trim();

  // Full Matchcut pipeline for 1688/taobao when OpenAI available
  if (listingUrl && isSupportedListingUrl(listingUrl) && hasOpenAiKey()) {
    try {
      let refB64 = input.referenceImageBase64;
      if (!refB64 && refUrl) {
        refB64 = (await fetchUrlAsBase64(refUrl)) ?? undefined;
      }
      if (refB64) {
        const pipeline = await runSourcingPipeline({
          url: listingUrl,
          referenceImageBase64: refB64,
          generateAngles: input.generateAngles ?? true,
          maxAngles: 3,
        });
        const thumb =
          pipeline.match.bestMatch?.imageUrl ??
          pipeline.listing.images[0]?.url ??
          refUrl;
        const generatedImages = pipeline.generatedAngles
          .map((a) => a.imageUrl ?? (a.imageBase64 ? `data:image/png;base64,${a.imageBase64}` : ""))
          .filter(Boolean);

        if (pipeline.detailPageHtml) {
          return {
            status: "ready",
            html: pipeline.detailPageHtml,
            thumbnailUrl: thumb,
            generatedImages,
            source: "matchcut_pipeline",
          };
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "MATCHCUT_PIPELINE_FAIL";
      // Fall through to Hookable
      console.warn("[matchcut-adapter] pipeline failed:", msg);
    }
  }

  // Hookable-class layout with wholesale/import images
  try {
    const hookable = await buildHookableDetailFromPick(
      input.pick,
      input.mode,
      input.sellingPoints,
    );
    return {
      status: "ready",
      html: hookable.html,
      thumbnailUrl: hookable.thumbnailUrl,
      generatedImages: hookable.images,
      source: "hookable",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "HOOKABLE_FAIL";
    return { status: "deferred", note: `상세 생성 실패: ${msg}` };
  }
}
