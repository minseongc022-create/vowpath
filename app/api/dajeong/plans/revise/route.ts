import { NextResponse } from "next/server";
import { z } from "zod";
import { reviseDajeongPlanWithDiscovery } from "@/dajeong/lib/concierge";
import { getRegisteredPlan, registerPlanForNotifications } from "@/dajeong/lib/notification-store";
import { resweepPlan } from "@/dajeong/lib/notification-sweep";
import type { DajeongPlan } from "@/dajeong/lib/types";
import { dajeongAiRateLimit } from "@/lib/security/ai-route-guard";

const schema = z.object({
  instruction: z.string().trim().min(2).max(300),
  plan: z.record(z.string(), z.unknown()),
  targetCategory: z.enum(["activity", "cafe", "meal", "view", "lodging", "cake", "flower", "gift", "moment"]).optional(),
  targetItemId: z.string().trim().min(1).max(140).optional(),
});

export async function POST(request: Request) {
  const limited = await dajeongAiRateLimit(request);
  if (limited) return NextResponse.json(limited, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "바꾸고 싶은 내용을 한 문장으로 적어줘." }, { status: 400 });
  const result = await reviseDajeongPlanWithDiscovery(parsed.data.plan as DajeongPlan, parsed.data.instruction, parsed.data.targetCategory, parsed.data.targetItemId);
  // Keep the server's notification-scheduling copy in sync so a stale plan version (deleted
  // items, moved times) can never fire an already-meaningless reminder — see notification-sweep.
  try {
    const registered = await getRegisteredPlan(result.plan.id);
    if (registered) {
      await registerPlanForNotifications(result.plan, registered.ownerId);
      await resweepPlan(result.plan.id);
    }
  } catch {
    // Never let notification bookkeeping fail the actual plan edit the user is waiting on.
  }
  return NextResponse.json(result);
}
