import { notFound, redirect } from "next/navigation";
import { ChaebiHeader } from "@/chaebi/components/layout/ChaebiHeader";
import { PlanProgress } from "@/chaebi/components/plan/PlanProgress";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { advancePlan } from "@/chaebi/lib/fulfillment";
import { currentOwnerId } from "@/chaebi/lib/session";
import { loadOwnedPlan, savePlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const dynamic = "force-dynamic";

export default async function ChaebiProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await currentOwnerId();
  if (!ownerId) redirect(CHAEBI_ROUTES.home);

  const stored = await loadOwnedPlan(id, ownerId);
  if (!stored) notFound();

  // 아직 확정 전이면 확인 화면이 맞다
  if (stored.status === "draft") redirect(CHAEBI_ROUTES.plan(id));

  // 첫 렌더부터 최신 상태로 — 클라이언트 폴링을 기다리게 하면 화면이 한 박자 늦다
  const { plan, changed } = advancePlan(stored);
  if (changed) await savePlan(plan);

  return (
    <>
      <ChaebiHeader back={CHAEBI_ROUTES.plans} title="진행 상황" />
      <PlanProgress initialPlan={toPlanView(plan)} />
    </>
  );
}
