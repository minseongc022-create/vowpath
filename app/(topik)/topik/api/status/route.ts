import { NextResponse } from "next/server";
import { getTopikOpenAiStatus } from "@/topik/lib/openai-config";

export async function GET() {
  const openai = getTopikOpenAiStatus();
  return NextResponse.json({
    ok: true,
    openai,
    features: {
      writing: openai.ready,
      speaking: openai.ready,
      whisper: openai.ready,
    },
  });
}
