import { NextResponse } from "next/server";
import { ERRORS, readJson, requireOwner } from "@/chaebi/lib/api";
import { advancePlan, cancelPlan, isLiveFulfillment } from "@/chaebi/lib/fulfillment";
import { applyOverrides, type BriefOverrides } from "@/chaebi/lib/parse";
import { buildHeadline } from "@/chaebi/lib/parse-rules";
import { buildPlan } from "@/chaebi/lib/plan-engine";
import { seoulDateISO } from "@/chaebi/lib/datetime";
import { loadOwnedPlan, savePlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * 계획 조회 — 읽을 때마다 진행 상태를 다시 계산한다.
 * 크론이 없어도 진행이 멈추지 않는 이유가 여기 있다(fulfillment.ts 참고).
 */
export async function GET(request: Request, { params }: Params) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const { id } = await params;
  const stored = await loadOwnedPlan(id, ownerId);
  if (!stored) return ERRORS.notFound();

  const { plan, changed } = advancePlan(stored);
  if (changed) await savePlan(plan);

  return NextResponse.json({ plan: toPlanView(plan) });
}

/**
 * 조건(날짜·시간·지역·예산·인원)을 바꾼다 → 계획을 다시 짠다.
 *
 * 조건이 바뀌면 고른 항목도 같이 바뀌어야 한다. 예산을 20만원에서 50만원으로
 * 올렸는데 20만원짜리 조합이 그대로 남아 있으면 "AI가 일을 안 한다"고 느낀다.
 * 그래서 부분 수정이 아니라 다시 짠다 — 대신 직접 고른 항목이 날아간다는 걸
 * 화면에서 미리 알린다.
 */
export async function PATCH(request: Request, { params }: Params) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const { id } = await params;
  const plan = await loadOwnedPlan(id, ownerId);
  if (!plan) return ERRORS.notFound();
  if (plan.status !== "draft") {
    return ERRORS.locked("이미 진행 중인 계획입니다. 바꾸려면 먼저 취소해 주세요.");
  }

  const body = await readJson<{ overrides?: BriefOverrides }>(request);
  if (!body?.overrides) return ERRORS.badRequest("바꿀 조건이 없습니다.");

  const now = new Date();
  const brief = applyOverrides(plan.brief, body.overrides, now);
  brief.headline = buildHeadline(brief, seoulDateISO(now));

  const rebuilt = buildPlan({
    brief,
    ownerId,
    planId: plan.id,
    now,
    liveFulfillment: isLiveFulfillment(),
  });
  const next = { ...rebuilt, createdAt: plan.createdAt };
  await savePlan(next);
  return NextResponse.json({ plan: toPlanView(next) });
}

/** 계획 전체 취소 */
export async function DELETE(request: Request, { params }: Params) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const { id } = await params;
  const stored = await loadOwnedPlan(id, ownerId);
  if (!stored) return ERRORS.notFound();
  if (stored.status === "completed") {
    return ERRORS.locked("이미 끝난 계획은 취소할 수 없습니다.");
  }

  const cancelled = cancelPlan(stored);
  await savePlan(cancelled);
  return NextResponse.json({ plan: toPlanView(cancelled) });
}
