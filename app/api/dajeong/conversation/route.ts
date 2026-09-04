import { NextResponse } from "next/server";
import { z } from "zod";
import { continuePlanningConversation } from "@/dajeong/lib/planning-brain";
import type { PlanRequest, PlanningQuestionKey } from "@/dajeong/lib/types";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(600),
  })).min(1).max(40),
  draft: z.record(z.string(), z.unknown()).optional(),
  currentQuestion: z.enum(["recipient", "date", "region", "departure", "budget", "partySize", "tripLength", "preference", "transport", "lodgingPreference", "arrivalTime", "returnTime", "mustHave", "availabilityTime", "density"]).nullable().optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "방금 말한 내용을 한 번만 다시 보내줄래?" }, { status: 400 });
  try {
    const result = await continuePlanningConversation({
      messages: parsed.data.messages,
      draft: parsed.data.draft as Partial<PlanRequest> | undefined,
      currentQuestion: parsed.data.currentQuestion as PlanningQuestionKey,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "대화를 이어가지 못했어. 방금 답변을 한 번만 다시 보내줘." }, { status: 500 });
  }
}
