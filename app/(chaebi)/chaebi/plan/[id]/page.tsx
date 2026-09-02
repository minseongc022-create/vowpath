import { notFound, redirect } from "next/navigation";
import { ChaebiHeader } from "@/chaebi/components/layout/ChaebiHeader";
import { PlanReview } from "@/chaebi/components/plan/PlanReview";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { currentOwnerId } from "@/chaebi/lib/session";
import { loadOwnedPlan } from "@/chaebi/lib/store";
import { toPlanView } from "@/chaebi/lib/view";

export const dynamic = "force-dynamic";

export default async function ChaebiPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerId = await currentOwnerId();
  if (!ownerId) redirect(CHAEBI_ROUTES.home);

  const plan = await loadOwnedPlan(id, ownerId);
  if (!plan) notFound();

  // 이미 확정한 계획은 확인 화면이 아니라 진행 화면이 맞다
  if (plan.status !== "draft") redirect(CHAEBI_ROUTES.progress(id));

  return (
    <>
      <ChaebiHeader back={CHAEBI_ROUTES.home} title="이렇게 준비했어요" />
      <PlanReview initialPlan={toPlanView(plan)} />
    </>
  );
}
