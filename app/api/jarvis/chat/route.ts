import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState, appendChat } from "@/jarvis/core/store";
import { think } from "@/jarvis/chat/brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 대화 한 줄 — 사장님 말을 받아 실제로 일을 하고 답한다 */
export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "EMPTY_MESSAGE" }, { status: 400 });
  if (message.length > 2000) {
    return NextResponse.json({ error: "MESSAGE_TOO_LONG" }, { status: 400 });
  }

  const state = await loadState();
  appendChat(state, { role: "owner", text: message });

  let reply;
  try {
    reply = await think(state, message);
  } catch (e) {
    // 대화가 죽어도 사장님에게는 무슨 일인지 말해야 한다
    const turn = appendChat(state, {
      role: "jarvis",
      text: "처리 중에 문제가 생겼습니다. 잠시 뒤 다시 말씀해 주세요.",
      did: "error",
    });
    await saveState(state);
    console.warn("[jarvis-chat]", e);
    return NextResponse.json({ turn, chat: state.chat.slice(-40) });
  }

  const turn = appendChat(state, {
    role: "jarvis",
    text: reply.text,
    did: reply.did,
    attachments: reply.attachments,
  });

  await saveState(state);

  return NextResponse.json({
    turn,
    chat: state.chat.slice(-40),
    pendingCount: state.drafts.filter((d) => d.status === "pending_review").length,
  });
}

/** 대화 기록 불러오기 */
export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const state = await loadState();
  return NextResponse.json({
    chat: state.chat.slice(-40),
    pendingCount: state.drafts.filter((d) => d.status === "pending_review").length,
    settings: {
      monthlyGoalKrw: state.settings.monthlyGoalKrw,
      autopilotEnabled: state.settings.autopilotEnabled,
    },
    activity: state.activity,
    lastSourcingRun: state.lastSourcingRun,
  });
}
