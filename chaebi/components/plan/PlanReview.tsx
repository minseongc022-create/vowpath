"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BriefOverrides } from "@/chaebi/lib/parse";
import type { PlanItemView, PlanView } from "@/chaebi/lib/view";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import {
  ChaebiApiError,
  confirmPlanRequest,
  updateConditions,
  updateItem,
} from "@/chaebi/lib/client";
import { formatKrwExact, OCCASION_EMOJI } from "@/chaebi/lib/format";
import { formatKoreanTime, relativeDayLabel, seoulDateISO } from "@/chaebi/lib/datetime";
import {
  AlertIcon,
  ChevronDownIcon,
  ClockIcon,
  PeopleIcon,
  PinIcon,
  SparkIcon,
  SpinnerIcon,
  WalletIcon,
} from "@/chaebi/components/ui/Icons";
import { ItemCard } from "./ItemCard";
import { AlternativeSheet } from "./AlternativeSheet";
import { ConditionSheet } from "./ConditionSheet";
import { TimelineList } from "./TimelineList";
import { BudgetBar } from "./BudgetBar";

/**
 * 확인 화면 — 이 앱에서 사용자가 유일하게 "결정"하는 자리.
 *
 * 원칙 하나: 아무것도 안 골라도 버튼 하나로 끝나야 한다. 조건 수정, 항목 교체,
 * 항목 빼기는 전부 선택 사항이고 화면 아래로 가라앉아 있다. 위쪽은 "이렇게
 * 잡았습니다"라는 결론만 보여준다.
 */
export function PlanReview({ initialPlan }: { initialPlan: PlanView }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [swapTarget, setSwapTarget] = useState<PlanItemView | null>(null);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [busy, setBusy] = useState<null | "item" | "conditions" | "confirm">(null);
  const [error, setError] = useState<string | null>(null);
  const [blockedItems, setBlockedItems] = useState<string[]>([]);
  const [showTimeline, setShowTimeline] = useState(true);

  const today = seoulDateISO();
  const live = useMemo(() => plan.items.filter((item) => item.status !== "skipped"), [plan.items]);
  const hasUserPicks = plan.items.some((item) => item.userPicked);
  const editable = plan.status === "draft";

  function handleError(e: unknown) {
    if (e instanceof ChaebiApiError) {
      setError(e.message);
      setBlockedItems(e.itemIds);
    } else {
      setError("잠시 문제가 생겼습니다. 다시 시도해 주세요.");
    }
  }

  async function run<T>(kind: "item" | "conditions" | "confirm", action: () => Promise<T>) {
    setBusy(kind);
    setError(null);
    setBlockedItems([]);
    try {
      return await action();
    } catch (e) {
      handleError(e);
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function pickAlternative(catalogId: string) {
    const target = swapTarget;
    if (!target) return;
    const result = await run("item", () => updateItem(plan.id, target.id, { catalogId }));
    if (result) {
      setPlan(result.plan);
      setSwapTarget(null);
    }
  }

  async function toggleItem(item: PlanItemView, skipped: boolean) {
    const result = await run("item", () => updateItem(plan.id, item.id, { skipped }));
    if (result) setPlan(result.plan);
  }

  async function applyConditions(overrides: BriefOverrides) {
    const result = await run("conditions", () => updateConditions(plan.id, overrides));
    if (result) {
      setPlan(result.plan);
      setConditionsOpen(false);
    }
  }

  async function confirm() {
    const result = await run("confirm", () => confirmPlanRequest(plan.id));
    if (result) router.push(CHAEBI_ROUTES.progress(plan.id));
  }

  const summaryChips = [
    {
      icon: <ClockIcon className="h-3.5 w-3.5" />,
      label: `${relativeDayLabel(plan.brief.dateISO, today)} ${formatKoreanTime(plan.brief.startTime)}`,
    },
    { icon: <PinIcon className="h-3.5 w-3.5" />, label: plan.brief.regionLabel },
    { icon: <PeopleIcon className="h-3.5 w-3.5" />, label: `${plan.brief.headcount}명` },
    { icon: <WalletIcon className="h-3.5 w-3.5" />, label: formatKrwExact(plan.brief.budgetKrw) },
  ];

  return (
    <>
      <div className="flex-1 px-5 pb-4 pt-2">
        {/* 결론 먼저 */}
        <section className="cb-rise">
          <p className="text-[13px] font-bold text-cb-muted">
            <span className="mr-1" aria-hidden>
              {OCCASION_EMOJI[plan.brief.occasion]}
            </span>
            {plan.brief.headline}
          </p>
          <h1 className="mt-2 text-[21px] font-extrabold leading-[1.45] tracking-[-0.015em] text-cb-ink">
            {plan.openingLine}
          </h1>

          <button
            type="button"
            onClick={() => setConditionsOpen(true)}
            disabled={!editable}
            className="mt-3.5 flex w-full flex-wrap items-center gap-1.5 rounded-2xl border border-dashed border-cb-border-strong bg-cb-surface px-3 py-2.5 text-left transition enabled:hover:border-cb-primary disabled:opacity-70"
          >
            {summaryChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 rounded-full bg-cb-surface-alt px-2.5 py-1 text-[12px] font-bold text-cb-ink-soft"
              >
                {chip.icon}
                {chip.label}
              </span>
            ))}
            {editable ? (
              <span className="ml-auto pl-1 text-[12px] font-bold text-cb-primary">고치기</span>
            ) : null}
          </button>
        </section>

        {plan.brief.confidence < 0.6 && editable ? (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-cb-warn-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-cb-warn">
            <AlertIcon className="mt-0.5 h-3.5 w-3.5 flex-none" />
            말씀이 짧아서 제가 몇 가지는 추측했어요. 위 조건을 한 번만 확인해 주세요.
          </p>
        ) : null}

        {plan.immediateSteps.length ? (
          <ul className="mt-4 space-y-1.5">
            {plan.immediateSteps.map((step) => (
              <li
                key={step}
                className="flex items-start gap-2 text-[12.5px] leading-relaxed text-cb-ink-soft"
              >
                <SparkIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-cb-primary" />
                {step}
              </li>
            ))}
          </ul>
        ) : null}

        {/* 항목들 */}
        <section className="mt-6 space-y-2.5">
          <h2 className="px-1 text-[13px] font-bold text-cb-muted">
            제가 잡아둔 것 {live.length}가지
          </h2>
          {plan.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              editable={editable && busy === null}
              onSwap={setSwapTarget}
              onToggle={toggleItem}
              highlighted={blockedItems.includes(item.id)}
            />
          ))}
          {!plan.items.length ? (
            <p className="cb-card px-4 py-8 text-center text-[13px] leading-relaxed text-cb-muted">
              지금 조건으로는 잡을 수 있는 게 없었어요.
              <br />
              날짜나 예산을 조금만 바꿔볼까요?
            </p>
          ) : null}
        </section>

        {/* 예산 */}
        <section className="mt-4">
          <BudgetBar total={plan.totalKrw} budget={plan.brief.budgetKrw} />
        </section>

        {/* 동선 */}
        {plan.timeline.length ? (
          <section className="mt-6">
            <button
              type="button"
              onClick={() => setShowTimeline((value) => !value)}
              className="flex w-full items-center gap-2 px-1 pb-3 text-left"
              aria-expanded={showTimeline}
            >
              <h2 className="text-[13px] font-bold text-cb-muted">
                그날 이렇게 움직이시면 됩니다
              </h2>
              <ChevronDownIcon
                className="ml-auto h-4 w-4 text-cb-subtle transition-transform"
                strokeWidth={2.2}
              />
            </button>
            {showTimeline ? (
              <div className="cb-card px-4 py-4">
                <TimelineList entries={plan.timeline} items={plan.items} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 신뢰 고지 — 지금 이 예약이 진짜인지 아닌지를 숨기지 않는다 */}
        <p className="mt-6 rounded-2xl bg-cb-surface-alt px-4 py-3 text-[11.5px] leading-relaxed text-cb-muted">
          {plan.liveFulfillment ? (
            <>
              확정을 누르면 제휴 매장에 실제 예약·주문 요청이 들어갑니다. 취소 규정은 항목별로
              다르며 확정 후 안내됩니다.
            </>
          ) : (
            <>
              지금은 <b className="text-cb-ink-soft">시범 운영</b> 중이라 실제 매장 예약은 걸리지
              않습니다. 카탈로그의 상호·가격은 예시이며, 제휴 연동이 붙으면 같은 화면에서 그대로
              진짜 예약이 됩니다.
            </>
          )}
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-2xl border border-cb-danger/25 bg-cb-danger-soft px-4 py-3"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 flex-none text-cb-danger" />
            <p className="text-[13px] leading-relaxed text-cb-danger">{error}</p>
          </div>
        ) : null}
      </div>

      {editable ? (
        <div className="cb-actionbar">
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy !== null || !live.length}
            className="cb-btn cb-btn-primary h-14 w-full text-[16px]"
          >
            {busy === "confirm" ? (
              <>
                <SpinnerIcon className="h-5 w-5" />
                요청 보내는 중…
              </>
            ) : (
              <>
                이대로 전부 준비하기
                <span className="font-extrabold tabular-nums opacity-90">
                  {formatKrwExact(plan.totalKrw)}
                </span>
              </>
            )}
          </button>
          <p className="mt-2 text-center text-[11.5px] text-cb-subtle">
            누르면 {live.length}가지를 제가 순서대로 처리합니다
          </p>
        </div>
      ) : null}

      <AlternativeSheet
        item={swapTarget}
        onClose={() => setSwapTarget(null)}
        onPick={(catalogId) => void pickAlternative(catalogId)}
        busy={busy === "item"}
      />

      <ConditionSheet
        open={conditionsOpen}
        brief={plan.brief}
        onClose={() => setConditionsOpen(false)}
        onApply={(overrides) => void applyConditions(overrides)}
        busy={busy === "conditions"}
        hasUserPicks={hasUserPicks}
      />
    </>
  );
}
