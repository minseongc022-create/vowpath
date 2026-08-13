import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { saveTypingSession, resolveTopikUserId } from "@/topik/lib/store/file-store";

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as { cpm: number; accuracy: number; count: number };

    if (typeof body.cpm !== "number" || body.cpm < 0) {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }

    const progress = await saveTypingSession(userId, {
      cpm: body.cpm,
      accuracy: body.accuracy ?? 0,
      promptCount: body.count ?? 1,
    });

    return NextResponse.json({
      typingCount: progress.typingCount,
      bestTypingCpm: progress.bestTypingCpm,
    });
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
