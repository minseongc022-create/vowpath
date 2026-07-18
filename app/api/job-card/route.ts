import { NextResponse } from "next/server";
import { generateJobCardFromNotes } from "@/lib/job-card-ai";
import {
  JOB_CARD_HOURLY_LIMIT,
  JOB_CARD_HOURLY_WINDOW_SEC,
} from "@/lib/security/ai-limits";
import { checkRateLimit, rateLimitKey } from "@/lib/security/rate-limit";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  let notes = "";
  try {
    const body = await request.json();
    notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  if (notes.length < 10) {
    return NextResponse.json(
      { error: "Enter at least 10 characters of call notes." },
      { status: 400 },
    );
  }

  if (notes.length > 8000) {
    return NextResponse.json(
      { error: "Notes are too long. Keep it under 8,000 characters." },
      { status: 400 },
    );
  }

  const limited = await checkRateLimit({
    key: rateLimitKey("job-card", session.sub),
    limit: JOB_CARD_HOURLY_LIMIT,
    windowSeconds: JOB_CARD_HOURLY_WINDOW_SEC,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many job card requests. Try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const card = await generateJobCardFromNotes(notes, { transcript: notes });
    return NextResponse.json({ card });
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    if (message === "OPENAI_API_KEY_MISSING") {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add the key to .env.local and restart the server.",
        },
        { status: 503 },
      );
    }
    if (message === "OPENAI_INSUFFICIENT_QUOTA") {
      return NextResponse.json(
        {
          error:
            "OpenAI usage quota (credits) is exhausted. Add a payment method at platform.openai.com → Billing and top up.",
        },
        { status: 402 },
      );
    }
    if (message === "OPENAI_INVALID_KEY") {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is invalid. Replace OPENAI_API_KEY in .env.local and restart the server.",
        },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Could not generate the Job Card. Try again shortly." },
      { status: 500 },
    );
  }
}
