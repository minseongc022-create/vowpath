/**
 * 쉐어링크 자동 운전 — 한 바퀴
 *
 * `engine/autopilot.ts`와 같은 모양이다: 베스트랭킹을 훑어 후보를 찾고,
 * 게이트를 통과한 것 중 점수 순으로 골라 링크 발급 + 캡션까지 만들어
 * **검수 대기**에 올린다. 사장님이 승인하면(또는 `autoPublish`가 켜져
 * 있으면) 그때 채널에 게시한다.
 *
 * ★ 왜 검수 앞에서 멈추는가 — 이유도 자비스와 같다
 *
 * 광고 표시 문구는 항상 붙지만, 그렇다고 "아무 문구나 자동으로 나가도
 * 된다"는 뜻은 아니다. 사장님이 마지막에 한 번 보는 관문은 남긴다.
 */

import type { SharelinkChannel, SharelinkPost, SharelinkState } from "./types";
import { fetchBestRanking } from "./api";
import { checkSharelinkItem, scoreSharelinkItem } from "./rules";

export const SHARELINK_AUTOPILOT_VERSION = "1.0";

const MAX_POSTS_HARD_CAP = 5;
const PENDING_BACKPRESSURE = 10;

export type SharelinkCycleResult = {
  ranAt: string;
  itemsConsidered: number;
  postsCreated: number;
  rejections: Record<string, number>;
  idleReason?: string;
};

export async function runSharelinkCycle(
  state: SharelinkState,
  opts?: { force?: boolean },
): Promise<SharelinkCycleResult> {
  const ranAt = new Date().toISOString();
  const rejections: Record<string, number> = {};

  if (!state.settings.autopilotEnabled && !opts?.force) {
    return {
      ranAt,
      itemsConsidered: 0,
      postsCreated: 0,
      rejections,
      idleReason: "쉐어링크 자동 운전이 꺼져 있습니다.",
    };
  }

  const pending = state.posts.filter((p) => p.status === "pending_review").length;
  if (pending >= PENDING_BACKPRESSURE && !opts?.force) {
    return {
      ranAt,
      itemsConsidered: 0,
      postsCreated: 0,
      rejections,
      idleReason: `검수 대기가 ${pending}건 쌓여 있어 새로 만들지 않았습니다. 먼저 확인해 주세요.`,
    };
  }

  const ranking = await fetchBestRanking(state.settings);
  if (!ranking.ok) {
    return {
      ranAt,
      itemsConsidered: 0,
      postsCreated: 0,
      rejections,
      idleReason: ranking.reason,
    };
  }

  state.items = ranking.items;
  state.lastRun = {
    ranAt,
    itemsSeen: ranking.items.length,
    candidatesFound: 0,
    rejections,
    summary: "",
    elapsedMs: 0,
  };

  const scored = ranking.items
    .map((item) => {
      const gate = checkSharelinkItem({
        reviewCount: item.reviewCount,
        ratingAvg: item.ratingAvg,
        priceKrw: item.priceKrw,
        productId: item.productId,
        alreadyPostedIds: state.postedProductIds,
      });
      if (!gate.ok) {
        rejections[gate.failed] = (rejections[gate.failed] ?? 0) + 1;
        return null;
      }
      const { score, reasons } = scoreSharelinkItem({
        discountPct: item.discountPct,
        reviewCount: item.reviewCount,
        bestSeller: item.bestSeller,
        category: item.category,
      });
      return { ...item, score, scoreReasons: reasons };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.score - a.score);

  const limit = Math.min(state.settings.maxPostsPerCycle, MAX_POSTS_HARD_CAP);
  const picked = scored.slice(0, limit);

  // 이번 사이클에서 실제로 만든 게시 초안. 링크 발급까지 됐을 때만 센다 —
  // 발급이 실패한 후보는 검수 대기에 올려봐야 사장님이 승인해도 링크가
  // 없어 아무것도 못 하니, 애초에 초안으로 만들지 않는다.
  const created: SharelinkPost[] = [];

  for (const item of picked) {
    const { issueShareLink } = await import("./api");
    const link = await issueShareLink(state.settings, item.productId);
    if (!link.ok) {
      rejections["link_issue_failed"] = (rejections["link_issue_failed"] ?? 0) + 1;
      continue;
    }

    const channels: SharelinkChannel[] = [];
    if (state.settings.postToThreads) channels.push("threads");
    if (state.settings.postToInstagram) channels.push("instagram");
    if (channels.length === 0) {
      rejections["no_channel_enabled"] = (rejections["no_channel_enabled"] ?? 0) + 1;
      continue;
    }

    const { buildCaptions } = await import("./caption");
    const captions = buildCaptions(item, channels);

    const now = new Date().toISOString();
    const post: SharelinkPost = {
      id: `sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      item,
      status: "pending_review",
      shareUrl: link.shareUrl,
      linkIssuedAt: now,
      captions,
      createdAt: now,
      updatedAt: now,
    };

    state.posts.unshift(post);
    state.postedProductIds.push(item.productId);
    created.push(post);
  }

  state.lastAutopilotAt = ranAt;
  if (state.lastRun) {
    state.lastRun.candidatesFound = created.length;
    state.lastRun.rejections = rejections;
    state.lastRun.summary =
      created.length > 0
        ? `${created.length}건 검수 대기에 올림`
        : summarizeIdle(rejections, ranking.items.length);
  }

  return {
    ranAt,
    itemsConsidered: ranking.items.length,
    postsCreated: created.length,
    rejections,
    idleReason: created.length === 0 ? summarizeIdle(rejections, ranking.items.length) : undefined,
  };
}

function summarizeIdle(rejections: Record<string, number>, itemsSeen: number): string {
  if (itemsSeen === 0) return "베스트랭킹에서 상품을 하나도 못 찾았습니다";
  const top = Object.entries(rejections).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "이유를 알 수 없이 0건입니다 — 점검이 필요합니다";
  return `${itemsSeen}개 중 후보 0건 — 가장 큰 병목: ${top[0]} (${top[1]}건)`;
}

// ─────────────────────────────────────────────────────────────
// 승인된 초안 게시
// ─────────────────────────────────────────────────────────────

export async function publishSharelinkPost(
  state: SharelinkState,
  postId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const post = state.posts.find((p) => p.id === postId);
  if (!post) return { ok: false, reason: "게시 초안을 찾을 수 없습니다" };
  if (post.status === "published") return { ok: true };

  post.status = "publishing";
  post.publishResults = {};

  const { postToThreads } = await import("./channels/threads");
  const { postToInstagram } = await import("./channels/instagram");

  for (const caption of post.captions) {
    if (caption.channel === "threads") {
      const result = await postToThreads(state.settings, caption, post.item.imageUrl || undefined);
      post.publishResults.threads = result.ok
        ? { ok: true, postedId: result.postedId }
        : { ok: false, error: result.error };
    } else if (caption.channel === "instagram") {
      const result = await postToInstagram(state.settings, caption, post.item.imageUrl);
      post.publishResults.instagram = result.ok
        ? { ok: true, postedId: result.postedId }
        : { ok: false, error: result.error };
    }
  }

  const results = Object.values(post.publishResults);
  const anySucceeded = results.some((r) => r?.ok);
  const allFailed = results.length > 0 && results.every((r) => r && !r.ok);

  post.status = anySucceeded ? "published" : allFailed ? "failed" : "pending_review";
  post.updatedAt = new Date().toISOString();

  if (allFailed) {
    const reasons = results
      .map((r) => (r && !r.ok ? r.error : null))
      .filter(Boolean)
      .join("; ");
    return { ok: false, reason: reasons || "모든 채널 게시 실패" };
  }
  return { ok: true };
}
