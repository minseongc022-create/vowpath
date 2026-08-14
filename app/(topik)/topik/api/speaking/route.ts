import { NextResponse } from "next/server";
import { evaluateSpeaking } from "@/topik/lib/speaking/evaluator";
import {
  getSpeakingUsageThisMonth,
  incrementSpeakingUsage,
  markJourneyStep,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { canUseSpeaking } from "@/topik/lib/billing/topik-plan";
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
    const used = await getSpeakingUsageThisMonth(userId);
    if (!canUseSpeaking(used)) {
      return NextResponse.json({ error: "LIMIT", remaining: 0 }, { status: 429 });
    }

    const result = await evaluateSpeaking(body.scenarioId, body.transcript.trim());
    try {
      await incrementSpeakingUsage(userId);
      await markJourneyStep(userId, "speaking");
    } catch {
      /* progress optional on serverless */
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
