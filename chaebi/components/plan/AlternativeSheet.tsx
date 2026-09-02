"use client";

import type { PlanItemView } from "@/chaebi/lib/view";
import { formatKrwExact } from "@/chaebi/lib/format";
import { Sheet } from "@/chaebi/components/ui/Sheet";
import { CheckIcon } from "@/chaebi/components/ui/Icons";

/**
 * "다른 곳 보기".
 *
 * 목록을 길게 뿌리지 않는다. AI가 이미 순위를 매겨 놓은 상위 몇 개만 보여주고,
 * 각각 왜 후보인지(평점·가격·거리)를 같은 형식으로 나란히 둔다. 사용자가
 * 비교표를 읽는 게 아니라 한 번 훑고 고르게 하는 게 목적이다.
 */
export function AlternativeSheet({
  item,
  onClose,
  onPick,
  busy,
}: {
  item: PlanItemView | null;
  onClose: () => void;
  onPick: (catalogId: string) => void;
  busy: boolean;
}) {
  const current = item?.catalog;

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      title={item ? `${item.label} 다시 고르기` : ""}
      subtitle={current ? `지금은 ${current.name}` : undefined}
    >
      {item ? (
        <ul className="space-y-2 pb-2">
          {current ? (
            <li>
              <div className="cb-card-flat flex items-start gap-3 border-cb-primary bg-cb-primary-soft px-4 py-3.5">
                <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-cb-primary" strokeWidth={3} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-extrabold text-cb-ink">{current.name}</p>
                  <p className="mt-0.5 text-[12px] text-cb-muted">
                    {current.category} · {current.regionLabel} · 평점 {current.rating}
                  </p>
                </div>
                <p className="flex-none text-[14px] font-extrabold tabular-nums text-cb-ink">
                  {formatKrwExact(item.priceKrw)}
                </p>
              </div>
            </li>
          ) : null}

          {item.alternatives.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onPick(option.id)}
                className="cb-card-flat w-full px-4 py-3.5 text-left transition hover:border-cb-border-strong disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-extrabold text-cb-ink">{option.name}</p>
                    <p className="mt-0.5 text-[12px] text-cb-muted">
                      {option.category} · {option.regionLabel} · 평점 {option.rating} (
                      {option.reviewCount.toLocaleString("ko-KR")})
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-cb-ink-soft">
                      {option.highlight}
                    </p>
                  </div>
                  <p className="flex-none text-[14px] font-extrabold tabular-nums text-cb-ink">
                    {formatKrwExact(option.priceForPlan)}
                  </p>
                </div>
              </button>
            </li>
          ))}

          {!item.alternatives.length ? (
            <li className="py-8 text-center text-[13px] text-cb-muted">
              이 조건에서 바꿀 만한 다른 곳이 없습니다.
              <br />
              날짜나 예산을 조금 바꾸면 후보가 늘어납니다.
            </li>
          ) : null}
        </ul>
      ) : null}
    </Sheet>
  );
}
