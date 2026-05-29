import { NextResponse } from "next/server";
import { processInboundSpeech } from "@/lib/process-inbound-speech";
import { getSession } from "@/lib/session";
import { getTwilioDefaultUserId } from "@/lib/twilio-config";

const SAMPLE_SPEECH =
  "Hi, Sarah Johnson, no cool, indoor eighty-six degrees, two kids at home, need someone tonight. Phone five one two five five five zero one zero zero.";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 환경에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let speech = SAMPLE_SPEECH;
  try {
    const body = await request.json();
    if (typeof body?.speech === "string" && body.speech.trim().length >= 8) {
      speech = body.speech.trim();
    }
  } catch {
    /* use sample */
  }

  const userId = session.sub;
  const from = "+821055969438";
  const to = process.env.TWILIO_PHONE_NUMBER?.trim() ?? "+12255291680";

  try {
    const result = await processInboundSpeech(userId, speech, from, to, "P1");
    return NextResponse.json({
      ok: true,
      ...result,
      message: "통화 시뮬레이션 완료. 대시보드 인바운드 통화를 확인하세요.",
    });
  } catch (e) {
    console.error("[simulate-call]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "시뮬레이션 실패" },
      { status: 500 },
    );
  }
}
