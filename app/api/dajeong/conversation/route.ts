import { NextResponse } from "next/server";
import { z } from "zod";
import { continuePlanningConversation } from "@/dajeong/lib/planning-conversation";
import type { PlanRequest, PlanningQuestionKey } from "@/dajeong/lib/types";

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(600),
  })).min(1).max(40),
  draft: z.record(z.string(), z.unknown()).optional(),
  currentQuestion: z.enum(["recipient", "date", "region", "departure", "budget", "partySize", "tripLength", "preference", "transport", "lodgingPreference"]).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "말씀하신 내용을 다시 한 번 보내 주세요." }, { status: 400 });
  try {
    const result = await continuePlanningConversation({
      messages: parsed.data.messages,
      draft: parsed.data.draft as Partial<PlanRequest> | undefined,
      currentQuestion: parsed.data.currentQuestion as PlanningQuestionKey,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "대화를 이어가지 못했어요. 방금 답변을 한 번만 다시 보내 주세요." }, { status: 500 });
  }
}
