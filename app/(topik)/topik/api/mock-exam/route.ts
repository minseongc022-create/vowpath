import { NextResponse } from "next/server";
import { buildMockExamQuestions, getMockExamQuestionsByIds, scoreMockExam } from "@/topik/lib/mock-exam/ibt-exam";
import { resolveTopikUserId, saveMockExamResult } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import type { TopikLevel } from "@/topik/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = Number(searchParams.get("level") ?? "3") as TopikLevel;
  const questions = buildMockExamQuestions(level, 10);
  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      level?: TopikLevel;
      answers?: Record<string, number | string>;
      questionIds?: string[];
      durationSec?: number;
    };
    const level = (body.level ?? 3) as TopikLevel;
    const answers = body.answers ?? {};
    const questions =
      body.questionIds?.length
        ? getMockExamQuestionsByIds(body.questionIds)
        : buildMockExamQuestions(level, 10);
    const scored = scoreMockExam(questions, answers);

    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    await saveMockExamResult(userId, {
      level,
      score: scored.score,
      maxScore: scored.maxScore,
      correctCount: scored.correct,
      totalQuestions: scored.total,
      durationSec: body.durationSec ?? 0,
    });

    return NextResponse.json({
      ...scored,
      durationSec: body.durationSec ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
