import { NextResponse } from "next/server";
import { correctWriting } from "@/topik/lib/writing/corrector";
import type { WritingCorrectionRequest } from "@/topik/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WritingCorrectionRequest;
    if (!body.taskType || !body.answer?.trim()) {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }

    const result = await correctWriting({
      taskType: body.taskType,
      prompt: body.prompt ?? "",
      answer: body.answer.trim(),
      wordLimit: body.wordLimit,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
