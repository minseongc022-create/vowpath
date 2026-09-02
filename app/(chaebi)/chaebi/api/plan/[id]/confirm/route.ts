import { NextResponse } from "next/server";
import { ERRORS, requireOwner } from "@/chaebi/lib/api";
import { advancePlan, confirmPlan, stillFeasible } from "@/chaebi/lib/fulfillment";
import { getCatalogItem } from "@/chaebi/lib/catalog";
import { loadOwnedPlan, savePlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * "이대로 준비해주세요" — 원클릭.
 *
 * 누르기 전에 마지막으로 시간을 다시 본다. 계획을 만든 뒤 사용자가 30분을
 * 고민했으면 그 사이에 당일 케이크 마감이 지났을 수 있다. 그걸 확인 안 하고
 * 받아버리면 "확정됐다"고 해놓고 나중에 안 된다고 말하는 앱이 된다.
 */
export async function POST(request: Request, { params }: Params) {
  const ownerId = requireOwner(request);
  if (!ownerId) return ERRORS.noSession();

  const { id } = await params;
  const plan = await loadOwnedPlan(id, ownerId);
  if (!plan) return ERRORS.notFound();
  if (plan.status !== "draft") {
    return ERRORS.locked("이미 진행 중이거나 끝난 계획입니다.");
  }

  const live = plan.items.filter((item) => item.status !== "skipped");
  if (!live.length) return ERRORS.badRequest("진행할 항목이 하나도 없습니다.");

  const now = Date.now();
  const tooLate = live.filter((item) => !stillFeasible(plan, item, now));
  if (tooLate.length) {
    const names = tooLate
      .map((item) => getCatalogItem(item.catalogId)?.name)
      .filter(Boolean)
      .join(", ");
    return NextResponse.json(
      {
        error: "TOO_LATE",
        message: `${names}은(는) 남은 시간 안에 준비가 어렵습니다. 그 항목을 빼거나 시간을 조정해 주세요.`,
        itemIds: tooLate.map((item) => item.id),
      },
      { status: 409 },
    );
  }

  const confirmed = confirmPlan(plan, now);
  await savePlan(confirmed);

  // 응답에는 이미 첫 단계가 반영된 상태를 담는다 — 화면이 바로 움직인다
  const { plan: advanced } = advancePlan(confirmed, now);
  return NextResponse.json({ plan: toPlanView(advanced) });
}
