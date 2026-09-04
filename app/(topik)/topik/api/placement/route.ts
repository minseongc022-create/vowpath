import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { resolveTopikUserId, savePlacementResult } from "@/topik/lib/store/file-store";
import {
  scorePlacementAnswers,
  validatePlacementPayload,
  type PlacementAnswer,
} from "@/topik/lib/quiz/placement-scoring";
import type { TopikLevel } from "@/topik/types";

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as {
      answers?: PlacementAnswer[];
      /** @deprecated client-trusted level — ignored when answers present */
      level?: TopikLevel;
      correct?: number;
      total?: number;
    };

    if (body.answers?.length) {
      if (!validatePlacementPayload(body.answers)) {
        return NextResponse.json({ error: "INVALID_ANSWERS" }, { status: 400 });
      }

      const scored = scorePlacementAnswers(body.answers);
      const sectionScores = Object.fromEntries(
        scored.sectionScores.map((s) => [s.section, { correct: s.correct, total: s.total }]),
      );
      const progress = await savePlacementResult(userId, scored.level, {
        gaps: scored.gaps.map((g) => g.section),
        sectionScores,
      });

      return NextResponse.json({
        placementLevel: progress.placementLevel,
        targetLevel: progress.targetLevel,
        correct: scored.correct,
        total: scored.total,
        accuracy: scored.accuracy,
        sectionScores: scored.sectionScores,
        gaps: scored.gaps,
        recommendations: scored.recommendations,
      });
    }

    if (!body.level || body.level < 1 || body.level > 6) {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }

    const progress = await savePlacementResult(userId, body.level);
    return NextResponse.json({
      placementLevel: progress.placementLevel,
      targetLevel: progress.targetLevel,
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
