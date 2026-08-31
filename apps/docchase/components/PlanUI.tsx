"use client";

import Link from "next/link";
import { getPlan, type PlanId } from "@/lib/plans";

export function PlanBadge({ planId }: { planId: PlanId | string | undefined }) {
  const plan = getPlan(planId);
  return (
    <span className="rounded-full border border-pine-200 bg-pine-50 px-2.5 py-0.5 text-xs font-semibold text-pine-800">
      {plan.name}
    </span>
  );
}

export function UpgradeHint({
  feature,
  need = "standard",
}: {
  feature: string;
  need?: PlanId;
}) {
  const plan = getPlan(need);
  return (
    <div className="rounded-xl border border-amber-soft bg-amber-soft/40 px-3 py-2.5 text-sm text-amber-ink">
      <p>
        <strong>{feature}</strong>은 {plan.name}부터 사용할 수 있습니다.
      </p>
      <Link href="/dashboard/settings#plan" className="mt-1 inline-block font-semibold underline">
        플랜 변경하기
      </Link>
    </div>
  );
}
