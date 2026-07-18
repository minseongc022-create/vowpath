import { NextResponse } from "next/server";
import { answerSiteAssistantQuestion, siteAssistantGreeting } from "@/lib/site-assistant/answer";
import {
  SITE_ASSISTANT_BURST_LIMIT,
  SITE_ASSISTANT_BURST_WINDOW_SEC,
  SITE_ASSISTANT_HOURLY_LIMIT,
  SITE_ASSISTANT_HOURLY_WINDOW_SEC,
  SITE_ASSISTANT_MAX_QUESTION_CHARS,
  AI_MAX_HISTORY_TURN_CHARS,
} from "@/lib/security/ai-limits";
import {
  aiGuardRateLimitResponse,
  enforceAiRateLimits,
  finalizeAiAnswer,
  guardAiUserInput,
  siteAssistantRateLimitKeys,
} from "@/lib/security/ai-route-guard";
import { getSession } from "@/lib/session";
import { resolveServerUiLocale } from "@/lib/locale";

export const maxDuration = 25;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const greet = Boolean(body?.greet);
    const question = String(body?.question ?? "").trim();
    const history = Array.isArray(body?.history)
      ? (body.history as { role?: string; text?: string }[])
          .filter((h) => h?.role === "user" || h?.role === "assistant")
          .map((h) => ({
            role: h.role as "user" | "assistant",
            text: String(h.text ?? "").slice(0, AI_MAX_HISTORY_TURN_CHARS),
          }))
          .filter((h) => h.text)
      : [];

    const marketingOnly = Boolean(body?.marketing);
    const session = await getSession();
    const locale = await resolveServerUiLocale();
    const lang = locale === "es" ? "es" : locale === "ko" ? "ko" : "en";

    const rlKeys = siteAssistantRateLimitKeys(request);
    const limited = await enforceAiRateLimits(request, [
      {
        key: rlKeys.burst.key,
        limit: SITE_ASSISTANT_BURST_LIMIT,
        windowSeconds: SITE_ASSISTANT_BURST_WINDOW_SEC,
      },
      {
        key: rlKeys.hourly.key,
        limit: SITE_ASSISTANT_HOURLY_LIMIT,
        windowSeconds: SITE_ASSISTANT_HOURLY_WINDOW_SEC,
      },
    ]);
    if (limited) {
      return NextResponse.json(aiGuardRateLimitResponse(lang), { status: 429 });
    }

    if (greet && !question) {
      const reply = siteAssistantGreeting(locale, Boolean(session), marketingOnly);
      return NextResponse.json({ ok: true, ...reply });
    }

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const inputGuard = guardAiUserInput(question, SITE_ASSISTANT_MAX_QUESTION_CHARS, lang);
    if (!inputGuard.ok) {
      return NextResponse.json(
        { error: inputGuard.error, code: inputGuard.reason },
        { status: inputGuard.status },
      );
    }

    const reply = await answerSiteAssistantQuestion({
      question: inputGuard.text,
      history,
      locale,
      loggedIn: Boolean(session),
      marketingOnly,
    });

    return NextResponse.json({
      ok: true,
      answer: finalizeAiAnswer(reply.answer),
      suggestions: reply.suggestions,
    });
  } catch (e) {
    console.error("[site-assistant]", e);
    return NextResponse.json({ error: "Assistant unavailable" }, { status: 500 });
  }
}
