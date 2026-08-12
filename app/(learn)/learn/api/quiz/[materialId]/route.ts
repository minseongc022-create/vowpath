import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { getMaterial, resolveUserId } from "@/learn/lib/library/repository";
import { generateQuiz } from "@/learn/lib/quiz/generator";
import { gradeShortAnswer } from "@/learn/lib/quiz/evidence";
import {
  getOrCreateQuizSet,
  saveQuizAttempt,
} from "@/learn/lib/activity/file-store";
import type { QuizAnswer, QuizQuestion } from "@/learn/types/quiz";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
) {
  try {
    const session = await getLearnSession();
    const userId = resolveUserId(session?.user?.id);
    const { materialId } = await params;
    const regenerate = new URL(request.url).searchParams.get("regenerate") === "1";

    const material = await getMaterial(userId, materialId);
    if (!material) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (!material.analysis) {
      return NextResponse.json({ error: "NOT_READY" }, { status: 400 });
    }

    const quiz = await getOrCreateQuizSet(
      userId,
      materialId,
      () =>
        generateQuiz(
          materialId,
          material.title,
          material.analysis!,
          material.fullTranscript,
        ),
      regenerate,
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
      generateQuiz(
        materialId,
        material.title,
        material.analysis!,
        material.fullTranscript,
      ),
    );

    const graded = body.answers.map((a) => {
      const q = quiz.questions.find((x) => x.id === a.questionId);
      if (!q) return a;
      const correct = gradeAnswer(q, a);
      return { ...a, correct };
    });

    const score = graded.filter((a) => a.correct).length;
    const attempt = {
      id: `attempt-${Date.now()}`,
      materialId,
      materialTitle: material.title,
      score,
      total: quiz.questions.length,
      answers: graded,
      completedAt: new Date().toISOString(),
    };

    const wrongOnes = graded
      .filter((a) => !a.correct)
      .map((a) => {
        const q = quiz.questions.find((x) => x.id === a.questionId)!;
        return {
          materialId,
          materialTitle: material.title,
          questionId: a.questionId,
          question: q.question,
          type: q.type,
          options: q.options,
          correctIndex: q.correctIndex,
          correctAnswer: q.correctAnswer,
          selectedIndex: a.selectedIndex,
          textAnswer: a.textAnswer,
          explanation: q.explanation,
          evidence: q.evidence,
        };
      });

    const result = await saveQuizAttempt(userId, attempt, wrongOnes);

    return NextResponse.json({
      attempt: result.attempt,
      wrongAdded: result.wrongAdded,
      score,
      total: quiz.questions.length,
      percent: Math.round((score / quiz.questions.length) * 100),
      graded,
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

function gradeAnswer(q: QuizQuestion, a: QuizAnswer): boolean {
  if (q.type === "short_answer") {
    return gradeShortAnswer(a.textAnswer ?? "", q.correctAnswer ?? "");
  }
  return a.selectedIndex === q.correctIndex;
}
