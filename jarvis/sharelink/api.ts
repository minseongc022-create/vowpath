/**
 * 쉐어링크 Open API 클라이언트
 *
 * ★ 이 파일은 아직 "실제로 검증된" 코드가 아니다 — 정직하게 표시해둔다
 *
 * 2026-08 기준 쉐어링크 Open API 연동은 "신청 전" 상태다(승인 대상: 상품을
 * 소개·공유하는 서비스 — 블로그/오픈채팅방/카페 등. 가격비교·상품나열
 * 서비스는 승인 대상에서 명시적으로 제외됨). 즉 **아래 엔드포인트 경로와
 * 응답 필드명은 공식 문서에서 확인한 게 아니라, 베스트랭킹 화면에서 실제로
 * 관찰된 필드(순위·가격·할인율·리뷰수·평점·개당수익·배지)를 근거로 최선의
 * 추정으로 적어둔 것이다.**
 *
 * `domeggook-api.ts`가 겪은 사고(숫자가 문자열로 와서 전부 걸러졌던 것)가
 * 여기서도 그대로 날 수 있다 — 승인받아 진짜 응답을 받으면, 이 파일의
 * 필드명·타입을 그 응답에 맞춰 **반드시 다시 맞춰야 한다.** 그 전까지
 * `fetchBestRanking`은 안전하게 빈 배열을 내고 이유를 남긴다(아래
 * `SHARELINK_API_NOT_VERIFIED`) — 확인 안 된 파싱으로 잘못된 후보를
 * 만드느니, 소싱 0건이 낫다.
 */

import { resolveSharelinkConfig } from "./config";
import type { SharelinkItem, SharelinkSettings } from "./types";

export const SHARELINK_API_VERSION = "0.1-unverified";

/** 승인 후 실제 base URL로 바꾼다. 지금은 문서에 나온 도메인만 확실하다 */
const API_BASE = process.env.SHARELINK_API_BASE?.trim() || "https://sharelink.toss.im/api/v1";

export class SharelinkApiError extends Error {
  constructor(
    message: string,
    public code: "NOT_CONFIGURED" | "NOT_VERIFIED" | "REQUEST_FAILED" | "INVALID_RESPONSE",
  ) {
    super(message);
  }
}

export function isSharelinkApiConfigured(settings: SharelinkSettings): boolean {
  return resolveSharelinkConfig(settings) !== null;
}

// ─────────────────────────────────────────────────────────────
// 베스트랭킹 조회 — "지금 많이 팔리는 BEST"
// ─────────────────────────────────────────────────────────────

/** 관찰된 화면 그대로의 추정 응답 모양. 승인 후 실제 응답으로 교체할 것 */
type RawRankingItem = {
  productId?: string | number;
  rank?: number;
  title?: string;
  imageUrl?: string;
  price?: number | string;
  discountPct?: number | string;
  reviewCount?: number | string;
  ratingAvg?: number | string;
  commissionKrw?: number | string;
  bestSeller?: boolean;
  arrivesTomorrow?: boolean;
  category?: string;
};

/** 도메꾹 사고를 반복하지 않는다 — 문자열로 와도 숫자로, 못 읽으면 null */
function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type FetchRankingResult =
  | { ok: true; items: SharelinkItem[] }
  | { ok: false; reason: string; verified: false };

/**
 * 베스트랭킹을 가져온다.
 *
 * ★ 키가 없거나 API가 아직 미검증이면 실패를 숨기지 않는다
 *
 * `autopilot.ts`가 이 결과의 `ok`를 보고 사이클을 정상 종료(0건, 이유 남김)
 * 시켜야지, 여기서 예외를 던져 사이클 전체를 죽이면 안 된다 — 그래서 예외
 * 대신 결과 타입으로 실패를 표현한다.
 */
export async function fetchBestRanking(
  settings: SharelinkSettings,
  opts?: { category?: string; limit?: number },
): Promise<FetchRankingResult> {
  const config = resolveSharelinkConfig(settings);
  if (!config) {
    return { ok: false, verified: false, reason: "쉐어링크 API 키가 연결되어 있지 않습니다" };
  }

  // ★ 실제 승인이 나기 전까지는 여기서 멈춘다.
  //
  // 엔드포인트 경로·인증 헤더 이름·응답 필드가 전부 추정이라, 지금 그대로
  // fetch를 날리면 십중팔구 404/401이거나, 설령 200이 와도 필드명이 달라
  // 전부 null로 읽혀 "후보 0개"가 조용히 반복된다. 그건 `domeggook-api.ts`가
  // 겪었던 것과 똑같은 실패 모양이다 — 오류 없이 그냥 아무것도 안 나오는 것.
  // 그래서 승인 전에는 명시적인 이유("아직 검증 안 됨")를 남기고 빈 배열을
  // 내는 쪽을 택한다. 승인이 나면 이 블록을 지우고 아래 fetch 코드를 켠다.
  if (!process.env.SHARELINK_API_VERIFIED) {
    return {
      ok: false,
      verified: false,
      reason:
        "쉐어링크 Open API가 아직 승인/검증되지 않았습니다. 승인 후 실제 응답을 확인하고 " +
        "SHARELINK_API_VERIFIED=1로 켜주세요 (jarvis/sharelink/api.ts 상단 설명 참고)",
    };
  }

  try {
    const url = new URL("/best-ranking", API_BASE);
    if (opts?.category) url.searchParams.set("category", opts.category);
    url.searchParams.set("limit", String(opts?.limit ?? 30));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ok: false, verified: false, reason: `쉐어링크 API 응답 실패 (HTTP ${res.status})` };
    }

    const data = (await res.json()) as { items?: RawRankingItem[] };
    if (!Array.isArray(data.items)) {
      return { ok: false, verified: false, reason: "쉐어링크 API 응답 형식이 예상과 다릅니다" };
    }

    const items: SharelinkItem[] = [];
    const now = new Date().toISOString();
    for (const raw of data.items) {
      const priceKrw = toNum(raw.price);
      const productId = raw.productId != null ? String(raw.productId) : null;
      if (priceKrw == null || !productId || !raw.title) continue; // 얼버무리지 않는다

      items.push({
        id: `si_${productId}`,
        productId,
        rank: raw.rank,
        title: raw.title,
        imageUrl: raw.imageUrl ?? "",
        priceKrw,
        discountPct: toNum(raw.discountPct) ?? undefined,
        reviewCount: toNum(raw.reviewCount) ?? 0,
        ratingAvg: toNum(raw.ratingAvg) ?? undefined,
        commissionKrw: toNum(raw.commissionKrw) ?? undefined,
        bestSeller: raw.bestSeller,
        arrivesTomorrow: raw.arrivesTomorrow,
        category: raw.category,
        scoreReasons: [],
        score: 0,
        foundAt: now,
      });
    }

    return { ok: true, items };
  } catch (e) {
    return {
      ok: false,
      verified: false,
      reason: e instanceof Error ? `쉐어링크 API 호출 실패: ${e.message}` : "쉐어링크 API 호출 실패",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 링크 발급
// ─────────────────────────────────────────────────────────────

export type IssueLinkResult =
  | { ok: true; shareUrl: string }
  | { ok: false; reason: string };

export async function issueShareLink(
  settings: SharelinkSettings,
  productId: string,
): Promise<IssueLinkResult> {
  const config = resolveSharelinkConfig(settings);
  if (!config) return { ok: false, reason: "쉐어링크 API 키가 연결되어 있지 않습니다" };
  if (!process.env.SHARELINK_API_VERIFIED) {
    return { ok: false, reason: "쉐어링크 Open API가 아직 승인/검증되지 않았습니다" };
  }

  try {
    const res = await fetch(new URL(`/products/${productId}/share-link`, API_BASE), {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false, reason: `링크 발급 실패 (HTTP ${res.status})` };

    const data = (await res.json()) as { shareUrl?: string; url?: string };
    const shareUrl = data.shareUrl ?? data.url;
    if (!shareUrl) return { ok: false, reason: "응답에 링크가 없습니다" };
    return { ok: true, shareUrl };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? `링크 발급 호출 실패: ${e.message}` : "링크 발급 호출 실패",
    };
  }
}
