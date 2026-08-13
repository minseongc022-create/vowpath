import { NextResponse } from "next/server";
import {
  countUnresolvedWrong,
  getProgress,
  getSrsStats,
  resolveTopikUserId,
  setExamDate,
} from "@/topik/lib/store/file-store";
import { computePassProbability } from "@/topik/lib/analytics/pass-probability";
import { getLearnSession } from "@/learn/lib/auth";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";

export async function GET() {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const [progress, srs, wrongCount] = await Promise.all([
      getProgress(userId),
      getSrsStats(userId),
      countUnresolvedWrong(userId),
    ]);

    const report = computePassProbability({
      progress,
      srsTotal: srs.total,
      srsMastered: srs.mastered,
      srsDue: srs.due,
      wrongUnresolved: wrongCount,
      lessonTotal: TOPIK_CURRICULUM.length,
    });

    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as {
      action?: string;
      examDate?: string;
    };

    if (body.action === "set-exam-date" && body.examDate) {
      await setExamDate(userId, body.examDate);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "INVALID" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
