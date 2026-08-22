/**
 * Matchcut 연동 어댑터 (Phase 2 — 사용자 OK 후 연결)
 *
 * Matchcut(/matchcut)은 별도로 완성 중. Jarvis는 이 어댑터를 통해서만
 * 상세페이지·이미지 생성을 요청합니다. 현재는 deferred stub.
 *
 * 연결 시: lib/sourcing-detail/pipeline.ts → runSourcingPipeline
 */

export const MATCHCUT_ADAPTER_VERSION = "0.1-stub";

export type MatchcutRequest = {
  listingUrl?: string;
  referenceImageBase64?: string;
  keyword: string;
  productName: string;
};

export type MatchcutResult =
  | { status: "deferred"; note: string }
  | {
      status: "ready";
      html: string;
      thumbnailUrl?: string;
      generatedImages: string[];
    };

/** Matchcut 미연동 — Jarvis AI 상세페이지만 사용 */
export function isMatchcutEnabled(): boolean {
  return process.env.JARVIS_MATCHCUT_ENABLED === "true";
}

export async function requestMatchcutDetailPage(
  _input: MatchcutRequest,
): Promise<MatchcutResult> {
  if (!isMatchcutEnabled()) {
    return {
      status: "deferred",
      note:
        "Matchcut 연동 대기 중 — 현재 Jarvis AI 상세페이지 사용. Matchcut 완성 + 사용자 OK 후 JARVIS_MATCHCUT_ENABLED=true 로 연결.",
    };
  }
  // Phase 2: wire to runSourcingPipeline when user approves Matchcut integration
  return {
    status: "deferred",
    note: "Matchcut 플래그 ON — 파이프라인 연결은 다음 배포에서 활성화됩니다.",
  };
}
