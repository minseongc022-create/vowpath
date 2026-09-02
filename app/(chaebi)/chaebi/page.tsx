import { ChaebiHeader } from "@/chaebi/components/layout/ChaebiHeader";
import { AskScreen } from "@/chaebi/components/home/AskScreen";
import { CATALOG_SIZE } from "@/chaebi/lib/catalog";
import { currentOwnerId } from "@/chaebi/lib/session";
import { listPlans } from "@/chaebi/lib/store";

export const dynamic = "force-dynamic";

export default async function ChaebiHomePage() {
  const ownerId = await currentOwnerId();
  const plans = ownerId ? await listPlans(ownerId) : [];

  // 끝난 계획은 첫 화면에 안 띄운다 — 지금 신경 써야 할 것만 보여야 한다
  const recent = plans
    .filter((plan) => plan.status === "draft" || plan.status === "running" || plan.status === "confirmed")
    .slice(0, 2);

  return (
    <>
      <ChaebiHeader showPlans={plans.length > 0} />
      <AskScreen recent={recent} catalogSize={CATALOG_SIZE} />
    </>
  );
}
