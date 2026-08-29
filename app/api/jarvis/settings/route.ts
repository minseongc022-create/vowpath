import { NextResponse } from "next/server";
import { getJarvisSessionFromRequest } from "@/jarvis/core/session-request";
import { isOwnerSession } from "@/jarvis/core/access";
import { loadState, saveState } from "@/jarvis/core/store";
import { MIN_GOAL_KRW, MAX_GOAL_KRW } from "@/jarvis/chat/intents";
import { isDomeggookApiConfigured } from "@/jarvis/wholesale/domeggook-api";
import { resolveTossConfig, maskTossKey } from "@/jarvis/core/toss-config";
import { resolveSolapiConfig, solapiConfigFromEnv } from "@/jarvis/notify/solapi";
import { sendTestMessage } from "@/jarvis/engine/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getJarvisSessionFromRequest(request);
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
      toss: (() => {
        // 도매꾹과 같은 기준으로 본다 — 환경변수든 화면에서 넣었든 하나면
        // 연결된 것이다. 예전엔 저장소만 봐서, 서버에 키가 있는데도 계속
        // "미연결"로 떴다.
        const cfg = resolveTossConfig(s);
        return {
          connected: cfg !== null,
          fromEnv: cfg?.fromEnv ?? false,
          accessKeyMasked: cfg ? maskTossKey(cfg.accessKey) : null,
          sandbox: cfg?.sandbox ?? false,
        };
      })(),
      domeggook: {
        // 환경변수로 넣었거나 화면에서 넣었거나 — 둘 중 하나면 연결된 것이다
        connected: isDomeggookApiConfigured() || Boolean(s.domeggookApiKey),
        fromEnv: isDomeggookApiConfigured(),
      },
      openai: { connected: Boolean(process.env.OPENAI_API_KEY) },
      // 문자를 어느 길로 보내는지 보여준다. 안 보이면 왜 문자가 짧은지,
      // 왜 안 오는지 화면만 봐서는 알 수 없다.
      sms: (() => {
        const solapi = resolveSolapiConfig(s);
        if (solapi) {
          return {
            provider: "solapi",
            connected: true,
            senderPhone: solapi.from,
            fromEnv: solapiConfigFromEnv() !== null && !s.solapiApiKey,
            note: "국내 발송 — 긴 보고(LMS)를 보낼 수 있습니다",
          };
        }
        return {
          provider: "twilio",
          connected: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
          senderPhone: null,
          note:
            "국제발신 — 67자를 넘으면 문자가 잘려서 짧은 보고만 보냅니다. " +
            "솔라피(SOLAPI_API_KEY·SOLAPI_API_SECRET·SOLAPI_SENDER_PHONE)를 넣으시면 국내 발송으로 바뀝니다.",
        };
      })(),
    },
  });
}

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
  if (typeof body.solapiApiKey === "string") s.solapiApiKey = body.solapiApiKey.trim() || undefined;
  if (typeof body.solapiApiSecret === "string") {
    s.solapiApiSecret = body.solapiApiSecret.trim() || undefined;
  }
  if (typeof body.solapiSenderPhone === "string") {
    // 발신번호도 010 형식만 받는다 — 잘못 넣으면 솔라피가 거부하는데,
    // 그 거부 이유를 보려면 문자를 한 번 보내봐야 한다
    const digits = body.solapiSenderPhone.replace(/[^0-9]/g, "");
    if (digits && !/^01[0-9]{8,9}$/.test(digits)) {
      return NextResponse.json(
        { error: "BAD_SENDER", reason: "발신번호 형식이 아닙니다 (예: 01012345678)" },
        { status: 400 },
      );
    }
    s.solapiSenderPhone = digits || undefined;
  }

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

  // ★ 「테스트 문자 보내기」
  //
  // 문자는 30분 보고나 검수 알림이 있을 때만 나간다. 즉 키를 넣고
  // 잘 들어갔는지 확인하려면 30분을 기다려야 했다 — 그동안 발신번호
  // 등록이 안 됐어도 알 수 없다. 저장한 그 자리에서 한 통 보내본다.
  if (body.sendTest === true) {
    const phone = s.alertPhone;
    if (!phone) {
      return NextResponse.json(
        { ok: true, test: { sent: false, reason: "알림받을 휴대폰 번호를 먼저 넣어주세요." } },
        { status: 200 },
      );
    }
    const test = await sendTestMessage(phone, s);
    return NextResponse.json({ ok: true, test });
  }

  return NextResponse.json({ ok: true });
}
