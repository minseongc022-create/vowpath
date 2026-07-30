import { NextResponse } from "next/server";
import {
  clearOpenAiApiKey,
  ensureOpenAiApiKeyLoaded,
  isOpenAiConfigured,
  matchCutOpenAiErrorMessage,
  saveOpenAiApiKey,
  validateOpenAiApiKey,
} from "@/lib/matchcut/openai-config";
import { requireMatchCutSession } from "@/lib/matchcut/session";

export async function GET() {
  try {
    await requireMatchCutSession();
    const configured = await isOpenAiConfigured();
    const fromEnv = Boolean(process.env.OPENAI_API_KEY?.trim());
    return NextResponse.json({
      ok: true,
      configured,
      source: configured ? (fromEnv ? "env" : "saved") : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireMatchCutSession();
    const body = await request.json();
    const apiKey = String(body.apiKey ?? "").trim();
    if (!apiKey) {
      return NextResponse.json({ error: "API 키를 입력하세요." }, { status: 400 });
    }

    const validated = await validateOpenAiApiKey(apiKey);
    if (!validated.ok) {
      return NextResponse.json(
        { error: matchCutOpenAiErrorMessage(validated.error), code: validated.error },
        { status: 400 },
      );
    }

    await saveOpenAiApiKey(apiKey, session.sub);
    await ensureOpenAiApiKeyLoaded();

    return NextResponse.json({
      ok: true,
      configured: true,
      message: "OpenAI 키가 저장되었습니다. 이제 스캔 + 매칭을 다시 눌러 주세요.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "저장 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json(
      { error: matchCutOpenAiErrorMessage(msg), code: msg },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  try {
    await requireMatchCutSession();
    await clearOpenAiApiKey();
    return NextResponse.json({ ok: true, configured: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "삭제 실패";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
