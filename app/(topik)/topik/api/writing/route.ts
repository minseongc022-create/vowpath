import { NextResponse } from "next/server";
import { correctWriting } from "@/topik/lib/writing/corrector";
import {
  getWritingUsageThisMonth,
  incrementWritingUsage,
  markJourneyStep,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { canUseWriting, writingRemaining } from "@/topik/lib/billing/topik-plan";
import { getLearnSession } from "@/learn/lib/auth";
import type { WritingCorrectionRequest } from "@/topik/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WritingCorrectionRequest;
    if (!body.taskType || !body.answer?.trim()) {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }

    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const used = await getWritingUsageThisMonth(userId);
    if (!canUseWriting(used)) {
      return NextResponse.json(
        { error: "LIMIT", remaining: 0, limit: writingRemaining(used) },
        { status: 429 },
      );
    }

    const result = await correctWriting({
      taskType: body.taskType,
      prompt: body.prompt ?? "",
      answer: body.answer.trim(),
      wordLimit: body.wordLimit,
    });
    try {
      await incrementWritingUsage(userId);
      await markJourneyStep(userId, "writing");
    } catch {
      /* progress optional on serverless */
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
