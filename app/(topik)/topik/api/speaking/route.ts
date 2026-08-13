import { NextResponse } from "next/server";
import { evaluateSpeaking } from "@/topik/lib/speaking/evaluator";
import { incrementSpeakingCount, resolveTopikUserId } from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import type { SpeakingScenarioId } from "@/topik/types";
import { getSpeakingScenario } from "@/topik/lib/speaking/prompts";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scenarioId?: SpeakingScenarioId;
      transcript?: string;
    };
    if (!body.scenarioId || !getSpeakingScenario(body.scenarioId)) {
      return NextResponse.json({ error: "INVALID_SCENARIO" }, { status: 400 });
    }
    if (!body.transcript?.trim()) {
      return NextResponse.json({ error: "EMPTY" }, { status: 400 });
    }

    const session = await getLearnSession();
    const userId = resolveTopikUserId(session?.user?.id);
    const result = await evaluateSpeaking(body.scenarioId, body.transcript.trim());
    await incrementSpeakingCount(userId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
