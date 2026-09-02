import { NextResponse } from "next/server";
import { ERRORS, newPlanId, readJson, requireOwner } from "@/chaebi/lib/api";
import { parseSituation, type BriefOverrides } from "@/chaebi/lib/parse";
import { buildPlan } from "@/chaebi/lib/plan-engine";
import { isLiveFulfillment } from "@/chaebi/lib/fulfillment";
import { savePlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  text?: string;
  overrides?: BriefOverrides;
};

/** 상황 한 줄 → 완성된 계획. 이 앱의 유일한 진입점이다. */
export async function POST(request: Request) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const body = await readJson<CreateBody>(request);
  const text = body?.text?.trim();
  if (!text) return ERRORS.badRequest("무슨 일인지 한 줄만 적어주세요.");
  if (text.length > 1000) return ERRORS.badRequest("조금만 더 짧게 적어주세요.");

  try {
    const brief = await parseSituation(text, { overrides: body?.overrides });
    const plan = buildPlan({
      brief,
      ownerId,
      planId: newPlanId(),
      liveFulfillment: isLiveFulfillment(),
    });
    await savePlan(plan);
    return NextResponse.json({ plan: toPlanView(plan) }, { status: 201 });
  } catch {
    return ERRORS.server();
  }
}
