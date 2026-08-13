import { NextResponse } from "next/server";
import { transcribeKoreanSpeech } from "@/topik/lib/speaking/transcribe";
import { isLearnOpenAiReady } from "@/topik/lib/openai-config";

export async function POST(request: Request) {
  if (!isLearnOpenAiReady()) {
    return NextResponse.json({ error: "OPENAI_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob) || file.size < 100) {
      return NextResponse.json({ error: "INVALID_AUDIO" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await transcribeKoreanSpeech(buffer, "speech.webm");
    return NextResponse.json({ transcript: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    if (msg === "OPENAI_API_KEY_MISSING" || msg === "OPENAI_INVALID_KEY") {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return NextResponse.json({ error: "TRANSCRIBE_FAILED" }, { status: 500 });
  }
}
