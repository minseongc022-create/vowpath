import { NextResponse } from "next/server";
import { requireTossShopSessionFromRequest } from "@/toss-shop/lib/auth-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState } from "@/jarvis/core/store";
import { MIN_GOAL_KRW, MAX_GOAL_KRW } from "@/jarvis/chat/intents";
import { isDomeggookApiConfigured } from "@/toss-shop/lib/wholesale/domeggook-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 비밀키는 절대 그대로 내보내지 않는다 — 연결됐는지만 알려준다 */
function mask(v?: string): string | null {
  if (!v) return null;
  return v.length <= 4 ? "****" : `${v.slice(0, 2)}${"*".repeat(6)}${v.slice(-2)}`;
}

export async function GET(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const state = await loadState();
  const s = state.settings;

  return NextResponse.json({
    settings: {
      monthlyGoalKrw: s.monthlyGoalKrw,
      autopilotEnabled: s.autopilotEnabled,
      autoPublish: s.autoPublish,
      alertPhone: s.alertPhone ?? null,
      tossSandbox: s.tossSandbox ?? false,
    },
    connections: {
      toss: {
        connected: Boolean(s.tossAccessKey && s.tossSecretKey),
        accessKeyMasked: mask(s.tossAccessKey),
      },
      domeggook: {
        // 환경변수로 넣었거나 화면에서 넣었거나 — 둘 중 하나면 연결된 것이다
        connected: isDomeggookApiConfigured() || Boolean(s.domeggookApiKey),
        fromEnv: isDomeggookApiConfigured(),
      },
      openai: { connected: Boolean(process.env.OPENAI_API_KEY) },
    },
  });
}

export async function POST(request: Request) {
  const session = await requireTossShopSessionFromRequest(request);
  if (!isOwnerSession(session)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "BAD_JSON" }, { status: 400 });
  }

  const state = await loadState();
  const s = state.settings;

  if (typeof body.monthlyGoalKrw === "number") {
    const g = Math.round(body.monthlyGoalKrw);
    if (g < MIN_GOAL_KRW || g > MAX_GOAL_KRW) {
      return NextResponse.json(
        {
          error: "GOAL_OUT_OF_RANGE",
          reason: `목표는 ${(MIN_GOAL_KRW / 10_000).toLocaleString()}만원 ~ ${(MAX_GOAL_KRW / 10_000).toLocaleString()}만원 사이여야 합니다`,
        },
        { status: 400 },
      );
    }
    s.monthlyGoalKrw = g;
  }

  if (typeof body.autopilotEnabled === "boolean") s.autopilotEnabled = body.autopilotEnabled;
  if (typeof body.autoPublish === "boolean") s.autoPublish = body.autoPublish;
  if (typeof body.tossSandbox === "boolean") s.tossSandbox = body.tossSandbox;

  // 빈 문자열은 "지우기"로 본다 — 잘못 넣은 키를 화면에서 뺄 수 있어야 한다
  if (typeof body.tossAccessKey === "string") s.tossAccessKey = body.tossAccessKey.trim() || undefined;
  if (typeof body.tossSecretKey === "string") s.tossSecretKey = body.tossSecretKey.trim() || undefined;
  if (typeof body.domeggookApiKey === "string") s.domeggookApiKey = body.domeggookApiKey.trim() || undefined;

  if (typeof body.alertPhone === "string") {
    const digits = body.alertPhone.replace(/[^0-9]/g, "");
    if (digits && !/^01[0-9]{8,9}$/.test(digits)) {
      return NextResponse.json(
        { error: "BAD_PHONE", reason: "휴대폰 번호 형식이 아닙니다 (예: 01012345678)" },
        { status: 400 },
      );
    }
    s.alertPhone = digits || undefined;
  }

  await saveState(state);
  return NextResponse.json({ ok: true });
}
