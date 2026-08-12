import { NextResponse } from "next/server";
import { isLearnOpenAiReady } from "@/learn/lib/openai-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const openaiReady = isLearnOpenAiReady();
  return NextResponse.json({
    ok: openaiReady,
    learn: true,
    timestamp: new Date().toISOString(),
    openai: {
      configured: openaiReady,
      model: process.env.OPENAI_MODEL_ECONOMY ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    },
    features: {
      ingest: openaiReady,
      quiz: openaiReady,
      tutor: openaiReady,
      whisper: openaiReady,
    },
  });
}
