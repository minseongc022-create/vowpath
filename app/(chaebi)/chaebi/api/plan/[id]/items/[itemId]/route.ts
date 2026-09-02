import { NextResponse } from "next/server";
import { ERRORS, readJson, requireOwner } from "@/chaebi/lib/api";
import { swapItem, toggleItem } from "@/chaebi/lib/plan-engine";
import { loadOwnedPlan, savePlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; itemId: string }> };

type PatchBody = {
  /** 다른 업체·상품으로 교체 */
  catalogId?: string;
  /** 이번엔 빼기 / 되살리기 */
  skipped?: boolean;
};

/**
 * 확인 화면에서 항목 하나를 바꾸거나 뺀다.
 *
 * 확정(confirm) 전에만 허용한다. 이미 예약이 걸린 뒤에 조용히 다른 곳으로
 * 바꿔치기하면 사용자는 어느 쪽이 진짜인지 알 수 없게 된다 — 확정 후 변경은
 * 취소하고 다시 잡는 흐름이어야 한다.
 */
export async function PATCH(request: Request, { params }: Params) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const { id, itemId } = await params;
  const plan = await loadOwnedPlan(id, ownerId);
  if (!plan) return ERRORS.notFound();
  if (plan.status !== "draft") {
    return ERRORS.locked("이미 진행 중인 계획입니다. 바꾸려면 먼저 취소해 주세요.");
  }

  const body = await readJson<PatchBody>(request);
  if (!body) return ERRORS.badRequest("요청을 읽지 못했습니다.");

  let next = plan;
  if (typeof body.skipped === "boolean") {
    const toggled = toggleItem(next, itemId, body.skipped);
    if (!toggled) return ERRORS.notFound();
    next = toggled;
  }
  if (body.catalogId) {
    const swapped = swapItem(next, itemId, body.catalogId);
    if (!swapped) return ERRORS.badRequest("바꿀 수 없는 항목입니다.");
    next = swapped;
  }
  if (next === plan) return ERRORS.badRequest("바꿀 내용이 없습니다.");

  await savePlan(next);
  return NextResponse.json({ plan: toPlanView(next) });
}
