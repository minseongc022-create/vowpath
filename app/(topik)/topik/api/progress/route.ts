import { NextResponse } from "next/server";
import {
  getProgress,
  updateProgress,
  markLessonComplete,
  saveWrongAnswer,
  resolveWrongAnswer,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import type { TopikLevel } from "@/topik/types";

export async function GET() {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const progress = await getProgress(userId);
    return NextResponse.json(progress);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as {
      action: string;
      lessonId?: string;
      targetLevel?: TopikLevel;
      questionId?: string;
      question?: string;
      questionVi?: string;
      options?: string[];
      correctIndex?: number;
      correctAnswer?: string;
      selectedIndex?: number;
      textAnswer?: string;
      explanationVi?: string;
      level?: TopikLevel;
    };

    if (body.action === "complete-lesson" && body.lessonId) {
      await markLessonComplete(userId, body.lessonId);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "set-target" && body.targetLevel) {
      const progress = await updateProgress(userId, { targetLevel: body.targetLevel });
      return NextResponse.json(progress);
    }

    if (body.action === "wrong" && body.questionId && body.question && body.explanationVi && body.level) {
      const record = await saveWrongAnswer(userId, {
        questionId: body.questionId,
        question: body.question,
        questionVi: body.questionVi,
        options: body.options,
        correctIndex: body.correctIndex,
        correctAnswer: body.correctAnswer,
        selectedIndex: body.selectedIndex,
        textAnswer: body.textAnswer,
        explanationVi: body.explanationVi,
        level: body.level,
      });
      return NextResponse.json(record);
    }

    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as { action: string; id?: string };

    if (body.action === "resolve-wrong" && body.id) {
      const ok = await resolveWrongAnswer(userId, body.id);
      if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
