import { NextResponse } from "next/server";
import { getLearnSession } from "@/learn/lib/auth";
import { resolveTopikUserId, savePlacementResult } from "@/topik/lib/store/file-store";
import type { TopikLevel } from "@/topik/types";

export async function POST(request: Request) {
  try {
    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const body = (await request.json()) as { level: TopikLevel; correct?: number; total?: number };

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
