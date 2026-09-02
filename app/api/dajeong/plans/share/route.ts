import { NextResponse } from "next/server";
import { z } from "zod";
import { shareplan } from "@/dajeong/lib/companion-store";
import { redactPlanForViewer } from "@/dajeong/lib/secrecy";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({
  plan: z.record(z.string(), z.unknown()),
  ownerId: z.string().trim().min(1).max(80),
  ownerName: z.string().trim().min(1).max(20),
  companionId: z.string().trim().min(1).max(80),
  companionName: z.string().trim().min(1).max(20),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "공유에 필요한 정보를 확인해 주세요." }, { status: 400 });
  const result = await shareplan(parsed.data.plan as DajeongPlan, parsed.data.ownerId, parsed.data.ownerName, parsed.data.companionId, parsed.data.companionName);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ plan: result.record.plan, version: result.record.version, preview: redactPlanForViewer(result.record.plan, parsed.data.companionId) });
}
