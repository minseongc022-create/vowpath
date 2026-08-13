import { NextResponse } from "next/server";
import {
  getDueCards,
  listSrsCards,
  reviewSrsCard,
  addLessonVocabToSrs,
  getSrsStats,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import type { TopikLevel } from "@/topik/types";

export async function GET(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const { searchParams } = new URL(request.url);
    const dueOnly = searchParams.get("due") === "1";

    const stats = await getSrsStats(userId);
    const cards = dueOnly ? await getDueCards(userId) : await listSrsCards(userId);
    return NextResponse.json({ ...stats, cards });
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
      cardId?: string;
      quality?: number;
      lessonId?: string;
      level?: TopikLevel;
      items?: { id: string; korean: string; vietnamese: string }[];
    };

    if (body.action === "review" && body.cardId && body.quality !== undefined) {
      const updated = await reviewSrsCard(userId, body.cardId, body.quality);
      if (!updated) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json(updated);
    }

    if (body.action === "add-lesson-vocab" && body.lessonId && body.level && body.items) {
      const added = await addLessonVocabToSrs(userId, body.lessonId, body.level, body.items);
      return NextResponse.json({ added });
    }

    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
