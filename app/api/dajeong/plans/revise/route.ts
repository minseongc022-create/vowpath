import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDajeongPlanWithDiscovery } from "@/dajeong/lib/concierge";
import type { DajeongPlan } from "@/dajeong/lib/types";

const schema = z.object({
  instruction: z.string().trim().min(2).max(300),
  plan: z.record(z.string(), z.unknown()),
  targetCategory: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]).optional(),
  targetItemId: z.string().trim().min(1).max(140).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "바꾸고 싶은 내용을 한 문장으로 적어 주세요." }, { status: 400 });
  const result = await reviseDajeongPlanWithDiscovery(parsed.data.plan as DajeongPlan, parsed.data.instruction, parsed.data.targetCategory, parsed.data.targetItemId);
  return NextResponse.json(result);
}
