import { NextResponse } from "next/server";
import { answerSiteAssistantQuestion, siteAssistantGreeting } from "@/lib/site-assistant/answer";
import { getSession } from "@/lib/session";
import { runtimeUiLocale } from "@/lib/locale";

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
            text: String(h.text ?? "").slice(0, 2000),
          }))
          .filter((h) => h.text)
      : [];

    const session = await getSession();
    const locale = runtimeUiLocale();

    if (greet && !question) {
      const reply = siteAssistantGreeting(locale, Boolean(session));
      return NextResponse.json({ ok: true, ...reply });
    }

    if (!question) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const reply = await answerSiteAssistantQuestion({
      question,
      history,
      locale,
      loggedIn: Boolean(session),
    });

    return NextResponse.json({ ok: true, ...reply });
  } catch (e) {
    console.error("[site-assistant]", e);
    return NextResponse.json({ error: "Assistant unavailable" }, { status: 500 });
  }
}
