import { NextResponse } from "next/server";
import {
  getMockExamQuestionsByIds,
  scoreMockExam,
} from "@/topik/lib/mock-exam/ibt-exam";
import { buildMockByTier, type MockExamTier } from "@/topik/lib/mock-exam/tier-exams";
import { resolveTopikUserId, saveMockExamResult, markJourneyStep } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import type { TopikLevel } from "@/topik/types";

function parseTier(raw: string | null): MockExamTier {
  if (raw === "topik-i" || raw === "topik-ii" || raw === "topik-ibt" || raw === "eps-topik") {
    return raw;
  }
  return "topik-ibt";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = Number(searchParams.get("level") ?? "3") as TopikLevel;
  const tier = parseTier(searchParams.get("tier"));
  const questions = buildMockByTier(tier, level, 10);
  return NextResponse.json(questions);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      level?: TopikLevel;
      tier?: MockExamTier;
      answers?: Record<string, number | string>;
      questionIds?: string[];
      durationSec?: number;
    };
    const level = (body.level ?? 3) as TopikLevel;
    const tier = body.tier ?? "topik-ibt";
    const answers = body.answers ?? {};
    const questions =
      body.questionIds?.length
        ? getMockExamQuestionsByIds(body.questionIds)
        : buildMockByTier(tier, level, 10);
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
    await markJourneyStep(userId, "mock");

    return NextResponse.json({
      ...scored,
      durationSec: body.durationSec ?? 0,
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
