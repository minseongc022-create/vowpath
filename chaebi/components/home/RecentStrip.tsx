import Link from "next/link";
import type { PlanSummary } from "@/chaebi/lib/types";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { OCCASION_EMOJI, PLAN_STATUS_LABEL, formatKrw } from "@/chaebi/lib/format";
import { formatKoreanDate } from "@/chaebi/lib/datetime";
import { ChevronRightIcon } from "@/chaebi/components/ui/Icons";

/** 진행 중인 계획이 있으면 첫 화면에서 바로 이어갈 수 있게 띄운다. */
export function RecentStrip({ plans }: { plans: PlanSummary[] }) {
  if (!plans.length) return null;

  return (
    <section className="mt-7" aria-label="진행 중인 계획">
      <h2 className="mb-2 px-1 text-[13px] font-bold text-cb-muted">이어서 보기</h2>
      <ul className="space-y-2">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link
              href={
                plan.status === "draft" ? CHAEBI_ROUTES.plan(plan.id) : CHAEBI_ROUTES.progress(plan.id)
              }
              className="cb-card flex items-center gap-3 px-4 py-3 transition hover:border-cb-border-strong"
            >
              <span className="text-[20px]" aria-hidden>
                {OCCASION_EMOJI[plan.occasion]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-bold text-cb-ink">
                  {plan.headline}
                </span>
                <span className="mt-0.5 block text-[12px] text-cb-muted">
                  {formatKoreanDate(plan.dateISO)} · {PLAN_STATUS_LABEL[plan.status]} ·{" "}
                  {formatKrw(plan.totalKrw)}
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 flex-none text-cb-subtle" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
