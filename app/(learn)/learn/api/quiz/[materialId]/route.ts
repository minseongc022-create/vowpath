import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { generateQuizFromAnalysis } from "@/learn/lib/quiz/generator";
import {
  getOrCreateQuizSet,
  saveQuizAttempt,
} from "@/learn/lib/activity/file-store";
import type { QuizAnswer } from "@/learn/types/quiz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;

    const material = await getMaterial(userId, materialId);
    if (!material) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (!material.analysis) {
      return NextResponse.json({ error: "NOT_READY" }, { status: 400 });
    }

    const quiz = await getOrCreateQuizSet(userId, materialId, () =>
      generateQuizFromAnalysis(materialId, material.title, material.analysis!),
    );

    return NextResponse.json(quiz);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const body = (await request.json()) as { answers: QuizAnswer[] };

    const material = await getMaterial(userId, materialId);
    if (!material?.analysis) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const quiz = await getOrCreateQuizSet(userId, materialId, () =>
      generateQuizFromAnalysis(materialId, material.title, material.analysis!),
    );

    const score = body.answers.filter((a) => a.correct).length;
    const attempt = {
      id: `attempt-${Date.now()}`,
      materialId,
      materialTitle: material.title,
      score,
      total: quiz.questions.length,
      answers: body.answers,
      completedAt: new Date().toISOString(),
    };

    const wrongOnes = body.answers
      .filter((a) => !a.correct)
      .map((a) => {
        const q = quiz.questions.find((x) => x.id === a.questionId)!;
        return {
          materialId,
          materialTitle: material.title,
          questionId: a.questionId,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          selectedIndex: a.selectedIndex,
          explanation: q.explanation,
        };
      });

    const result = await saveQuizAttempt(userId, attempt, wrongOnes);

    return NextResponse.json({
      attempt: result.attempt,
      wrongAdded: result.wrongAdded,
      score,
      total: quiz.questions.length,
      percent: Math.round((score / quiz.questions.length) * 100),
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
