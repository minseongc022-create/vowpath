"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PlanView } from "@/chaebi/lib/view";
import { CHAEBI_ROUTES } from "@/chaebi/lib/brand";
import { cancelPlanRequest, fetchPlan } from "@/chaebi/lib/client";
import { formatKrwExact, OCCASION_EMOJI, planProgress } from "@/chaebi/lib/format";
import { formatCountdown, formatKoreanTime, relativeDayLabel, seoulDateISO, seoulEpoch } from "@/chaebi/lib/datetime";
import { AlertIcon, CheckIcon, SpinnerIcon } from "@/chaebi/components/ui/Icons";
import { ItemCard } from "./ItemCard";
import { TimelineList } from "./TimelineList";

/**
 * 진행 화면 — 확정 버튼을 누른 뒤.
 *
 * ★ 여기서 앱의 약속이 지켜지는지가 드러난다
 *
 * "다 해준다"고 해놓고 확정 후에 아무 소식이 없으면, 사용자는 결국 직접
 * 전화해서 확인한다. 그 순간 이 앱을 쓸 이유가 사라진다. 그래서 항목별로
 * 지금 어느 단계인지, 예약번호는 무엇인지, 막힌 게 있으면 어떻게 처리했는지를
 * 계속 보여준다.
 *
 * 폴링은 실제로 움직이는 동안에만 돈다(요청·확인 중). 전부 확정되면 멈춘다 —
 * 배터리를 쓰면서 아무 일도 안 일어나는 폴링은 그 자체로 신뢰를 깎는다.
 */

const POLL_MS = 2_000;

export function PlanProgress({ initialPlan }: { initialPlan: PlanView }) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const celebrated = useRef(false);

  const live = useMemo(() => plan.items.filter((item) => item.status !== "skipped"), [plan.items]);
  const moving = live.some(
    (item) => item.status === "requested" || item.status === "pending" || item.status === "reassigned",
  );
  const progress = planProgress(live.map((item) => item.status));
  const allSettled = live.length > 0 && live.every((item) =>
    ["confirmed", "ready", "in_transit", "done"].includes(item.status),
  );

  const refresh = useCallback(async () => {
    try {
      const { plan: next } = await fetchPlan(plan.id);
      setPlan(next);
    } catch {
      // 일시적인 실패는 조용히 넘긴다 — 다음 주기에 다시 시도한다
    }
  }, [plan.id]);

  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [moving, refresh]);

  // 카운트다운용 시계 — 움직이는 동안에만 돈다
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (allSettled && !celebrated.current) {
      celebrated.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(18);
      }
    }
  }, [allSettled]);

  async function cancel() {
    if (!window.confirm("정말 전부 취소할까요? 확정된 예약도 함께 취소 요청됩니다.")) return;
    setCancelling(true);
    setError(null);
    try {
      const { plan: next } = await cancelPlanRequest(plan.id);
      setPlan(next);
      router.refresh();
    } catch {
      setError("취소 요청이 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCancelling(false);
    }
  }

  const startEpoch = seoulEpoch(plan.brief.dateISO, plan.brief.startTime);
  const cancelled = plan.status === "cancelled";
  const completed = plan.status === "completed";

  return (
    <div className="flex-1 px-5 pb-10 pt-2">
      {/* 상태 헤드라인 */}
      <section className="cb-rise">
        <p className="text-[13px] font-bold text-cb-muted">
          <span className="mr-1" aria-hidden>
            {OCCASION_EMOJI[plan.brief.occasion]}
          </span>
          {plan.brief.headline}
        </p>

        <h1 className="mt-2 text-[24px] font-extrabold leading-[1.35] tracking-[-0.02em] text-cb-ink">
          {cancelled
            ? "취소했습니다"
            : completed
              ? "잘 끝났습니다"
              : allSettled
                ? "전부 확정됐습니다"
                : "지금 처리하고 있어요"}
        </h1>

        <p className="mt-2 text-[14px] leading-relaxed text-cb-muted">
          {cancelled ? (
            "모든 항목에 취소 요청을 넣었습니다."
          ) : allSettled ? (
            <>
              {relativeDayLabel(plan.brief.dateISO, seoulDateISO())}{" "}
              {formatKoreanTime(plan.brief.startTime)}까지{" "}
              <b className="text-cb-ink">{formatCountdown(startEpoch, now)}</b>. 그날은 아래 순서대로만
              움직이시면 됩니다.
            </>
          ) : (
            <>
              {live.length}가지를 순서대로 요청하고 있습니다. 화면을 닫아도 계속 진행됩니다.
            </>
          )}
        </p>

        {!cancelled ? (
          <div className="mt-4">
            <div className="cb-progress">
              <span
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  background: allSettled ? "var(--cb-good)" : undefined,
                }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[12px] font-bold">
              <span className="flex items-center gap-1.5 text-cb-muted">
                {moving ? (
                  <>
                    <SpinnerIcon className="h-3.5 w-3.5 text-cb-primary" />
                    확인 중
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-3.5 w-3.5 text-cb-good" strokeWidth={3} />
                    대기 없음
                  </>
                )}
              </span>
              <span className="tabular-nums text-cb-ink">{Math.round(progress * 100)}%</span>
            </div>
          </div>
        ) : null}
      </section>

      {/* 항목별 상태 */}
      <section className="mt-6 space-y-2.5">
        <h2 className="px-1 text-[13px] font-bold text-cb-muted">항목별 상태</h2>
        {plan.items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            editable={false}
            onSwap={() => undefined}
            onToggle={() => undefined}
          />
        ))}
      </section>

      <section className="mt-4">
        <div className="cb-card flex items-baseline justify-between px-4 py-3.5">
          <span className="text-[13px] font-bold text-cb-muted">결제 예정 합계</span>
          <span className="text-[18px] font-extrabold tabular-nums text-cb-ink">
            {formatKrwExact(plan.totalKrw)}
          </span>
        </div>
      </section>

      {plan.timeline.length && !cancelled ? (
        <section className="mt-6">
          <h2 className="px-1 pb-3 text-[13px] font-bold text-cb-muted">
            그날 이렇게 움직이시면 됩니다
          </h2>
          <div className="cb-card px-4 py-4">
            <TimelineList entries={plan.timeline} items={plan.items} />
          </div>
        </section>
      ) : null}

      <p className="mt-6 rounded-2xl bg-cb-surface-alt px-4 py-3 text-[11.5px] leading-relaxed text-cb-muted">
        {plan.liveFulfillment
          ? "제휴 매장에 실제 요청이 전달됐습니다. 매장 사정으로 변경이 생기면 대안을 찾아 다시 잡고 여기에 알려드립니다."
          : "시범 운영 중이라 실제 매장 예약은 걸리지 않습니다. 상태 변화는 실제 예약 흐름과 같은 단계를 따릅니다."}
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

      <div className="mt-6 flex gap-2">
        <Link href={CHAEBI_ROUTES.home} className="cb-btn cb-btn-ghost flex-1 py-3 text-[14px]">
          새로 채비하기
        </Link>
        {!cancelled && !completed ? (
          <button
            type="button"
            onClick={() => void cancel()}
            disabled={cancelling}
            className="cb-btn cb-btn-quiet flex-1 py-3 text-[14px] text-cb-danger"
          >
            {cancelling ? "취소하는 중…" : "전부 취소"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
