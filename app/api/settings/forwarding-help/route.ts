import { NextResponse } from "next/server";
import {
  answerForwardingHelpQuestion,
  FORWARDING_AI_DAILY_LIMIT,
} from "@/lib/forwarding-ai-help";
import { normalizeForwardingProvider, type ForwardingProviderId } from "@/lib/forwarding-guides";
import { resolveServerUiLocale } from "@/lib/locale";
import {
  FORWARDING_AI_BURST_LIMIT,
  FORWARDING_AI_BURST_WINDOW_SEC,
} from "@/lib/security/ai-limits";
import {
  finalizeAiAnswer,
  guardAiUserInput,
} from "@/lib/security/ai-route-guard";
import { checkRateLimit, peekRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/session";
import { getTenantTwilioPhone } from "@/lib/twilio-provision";

export const maxDuration = 25;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    question?: string;
    provider?: string;
    history?: { role?: string; text?: string }[];
  };

  const locale = await resolveServerUiLocale();
  const lang = locale === "ko" ? "ko" : locale === "es" ? "es" : "en";
  const inputGuard = guardAiUserInput(String(body.question ?? ""), 500, lang);
  if (!inputGuard.ok) {
    return NextResponse.json(
      { error: inputGuard.error, code: inputGuard.reason },
      { status: inputGuard.status },
    );
  }

  const provider = normalizeForwardingProvider(body.provider) as ForwardingProviderId;

  const burst = await checkRateLimit({
    key: rateLimitKey("forwarding-ai:burst", session.sub),
    limit: FORWARDING_AI_BURST_LIMIT,
    windowSeconds: FORWARDING_AI_BURST_WINDOW_SEC,
  });
  if (!burst.ok) {
    return NextResponse.json({ error: "rate_limit", remaining: 0 }, { status: 429 });
  }

  const rl = await checkRateLimit({
    key: rateLimitKey("forwarding-ai", session.sub),
    limit: FORWARDING_AI_DAILY_LIMIT,
    windowSeconds: 86_400,
  });

  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "daily_limit",
        remaining: 0,
        limit: FORWARDING_AI_DAILY_LIMIT,
        resetAt: rl.resetAt,
      },
      { status: 429 },
    );
  }

  const effiroadNumber = (await getTenantTwilioPhone(session.sub)) ?? "";

  const history = (body.history ?? [])
    .filter((h) => h?.role === "user" || h?.role === "assistant")
    .map((h) => ({
      role: h.role as "user" | "assistant",
      text: String(h.text ?? "").slice(0, 800),
    }))
    .slice(-6);

  try {
    const answer = finalizeAiAnswer(
      await answerForwardingHelpQuestion({
        question: inputGuard.text,
        provider,
        effiroadNumber,
        history,
        locale,
      }),
    );

    return NextResponse.json({
      ok: true,
      answer,
      remaining: rl.remaining,
      limit: FORWARDING_AI_DAILY_LIMIT,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "OPENAI_API_KEY_MISSING") {
      return NextResponse.json({ error: "AI unavailable" }, { status: 503 });
    }
    console.error("[forwarding-help]", e);
    return NextResponse.json({ error: "Could not get an answer. Try again." }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await peekRateLimit({
    key: rateLimitKey("forwarding-ai", session.sub),
    limit: FORWARDING_AI_DAILY_LIMIT,
    windowSeconds: 86_400,
  });

  return NextResponse.json({
    limit: FORWARDING_AI_DAILY_LIMIT,
    remaining: rl.remaining,
    resetAt: rl.resetAt,
  });
}
