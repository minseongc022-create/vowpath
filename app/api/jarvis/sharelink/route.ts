import { NextResponse } from "next/server";
import { getJarvisSessionFromRequest } from "@/jarvis/core/session-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState } from "@/jarvis/core/store";
import { emptySharelinkState } from "@/jarvis/sharelink/types";
import { runSharelinkCycle, publishSharelinkPost } from "@/jarvis/sharelink/autopilot";
import {
  resolveSharelinkConfig,
  resolveThreadsConfig,
  resolveInstagramConfig,
  maskKey,
} from "@/jarvis/sharelink/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 검수 대기 목록 + 연결 상태 */
export async function GET(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const state = await loadState();
  const sl = state.sharelink ?? emptySharelinkState();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const post = sl.posts.find((p) => p.id === id);
    if (!post) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ post });
  }

  return NextResponse.json({
    posts: sl.posts.filter((p) => p.status === "pending_review"),
    published: sl.posts.filter((p) => p.status === "published").length,
    settings: {
      autopilotEnabled: sl.settings.autopilotEnabled,
      autoPublish: sl.settings.autoPublish,
      postToThreads: sl.settings.postToThreads,
      postToInstagram: sl.settings.postToInstagram,
      maxPostsPerCycle: sl.settings.maxPostsPerCycle,
    },
    connections: {
      // 셋 다 "미연결"이 지금 정상 상태다 — 쉐어링크 API·Threads·Instagram
      // 전부 승인/심사 대기 중이라, 여기 connected:true가 뜨는 순간이
      // 진짜로 자동 게시를 켤 수 있는 시점이다.
      sharelink: (() => {
        const cfg = resolveSharelinkConfig(sl.settings);
        return { connected: cfg !== null, fromEnv: cfg?.fromEnv ?? false };
      })(),
      threads: (() => {
        const cfg = resolveThreadsConfig(sl.settings);
        return {
          connected: cfg !== null,
          fromEnv: cfg?.fromEnv ?? false,
          accessKeyMasked: cfg ? maskKey(cfg.accessKey) : null,
        };
      })(),
      instagram: (() => {
        const cfg = resolveInstagramConfig(sl.settings);
        return {
          connected: cfg !== null,
          fromEnv: cfg?.fromEnv ?? false,
          accessKeyMasked: cfg ? maskKey(cfg.accessKey) : null,
        };
      })(),
    },
    lastRun: sl.lastRun,
  });
}

/** 설정 변경 · 수동 소싱 · 승인 · 반려 · 게시 */
export async function POST(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const state = await loadState();
  state.sharelink ??= emptySharelinkState();
  const sl = state.sharelink;
  const action = typeof body.action === "string" ? body.action : undefined;

  // ── 설정 저장 ────────────────────────────────────────────
  if (action === "save_settings") {
    if (typeof body.autopilotEnabled === "boolean") sl.settings.autopilotEnabled = body.autopilotEnabled;
    if (typeof body.autoPublish === "boolean") sl.settings.autoPublish = body.autoPublish;
    if (typeof body.postToThreads === "boolean") sl.settings.postToThreads = body.postToThreads;
    if (typeof body.postToInstagram === "boolean") sl.settings.postToInstagram = body.postToInstagram;
    // 빈 문자열은 "지우기"로 본다 — toss-config.ts와 같은 규칙
    if (typeof body.sharelinkApiKey === "string") {
      sl.settings.sharelinkApiKey = body.sharelinkApiKey.trim() || undefined;
    }
    if (typeof body.threadsAccessKey === "string") {
      sl.settings.threadsAccessKey = body.threadsAccessKey.trim() || undefined;
    }
    if (typeof body.threadsUserId === "string") {
      sl.settings.threadsUserId = body.threadsUserId.trim() || undefined;
    }
    if (typeof body.instagramAccessKey === "string") {
      sl.settings.instagramAccessKey = body.instagramAccessKey.trim() || undefined;
    }
    if (typeof body.instagramUserId === "string") {
      sl.settings.instagramUserId = body.instagramUserId.trim() || undefined;
    }
    await saveState(state);
    return NextResponse.json({ ok: true });
  }

  // ── 지금 한 바퀴 돌리기 ──────────────────────────────────
  if (action === "source_now") {
    const result = await runSharelinkCycle(sl, { force: true });
    await saveState(state);
    return NextResponse.json({ ok: true, result });
  }

  const postId = typeof body.postId === "string" ? body.postId : undefined;
  const post = postId ? sl.posts.find((p) => p.id === postId) : undefined;

  if (action === "reject") {
    if (!post) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    post.status = "rejected";
    post.rejectReason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;
    post.decidedBy = session.email;
    post.updatedAt = new Date().toISOString();
    await saveState(state);
    return NextResponse.json({ ok: true, post });
  }

  if (action === "approve") {
    if (!post) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    post.status = "approved";
    post.decidedBy = session.email;
    post.updatedAt = new Date().toISOString();

    // 승인과 동시에 게시까지 — drafts 쪽과 달리 여기는 "승인=바로 게시"가
    // 자연스럽다. 토스 등록처럼 재고·가격이 시간에 따라 어긋나는 대상이
    // 아니라(캡션은 이미 확정된 텍스트다), 승인 화면과 별도 발행 버튼을
    // 두 번 거치게 하면 그 사이 무의미한 대기만 생긴다.
    const result = await publishSharelinkPost(sl, post.id);
    await saveState(state);
    return NextResponse.json({ ok: result.ok, post, reason: result.reason });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
