import { formatKrwExact } from "@/chaebi/lib/format";

/**
 * 예산 대비 총액.
 *
 * 예산을 넘겼을 때 조용히 넘기지 않는다. 사용자가 말한 숫자를 앱이 임의로
 * 초과하면 그다음부터는 모든 추천을 의심하게 된다. 넘겼으면 넘겼다고,
 * 얼마나 넘겼는지까지 그대로 보여준다.
 */
export function BudgetBar({ total, budget }: { total: number; budget: number }) {
  const ratio = budget > 0 ? total / budget : 0;
  const over = total > budget;
  const width = Math.min(100, Math.round(ratio * 100));

  return (
    <div className="cb-card px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-bold text-cb-muted">합계</span>
        <span className="text-[19px] font-extrabold tabular-nums text-cb-ink">
          {formatKrwExact(total)}
        </span>
      </div>

      <div className="cb-progress mt-2.5">
        <span
          style={{
            width: `${width}%`,
            background: over ? "var(--cb-warn)" : undefined,
          }}
        />
      </div>

      <p className="mt-2 text-[12.5px] text-cb-muted">
        {over ? (
          <span className="font-bold text-cb-warn">
            말씀하신 예산({formatKrwExact(budget)})보다 {formatKrwExact(total - budget)} 많습니다
          </span>
        ) : (
          <>
            예산 {formatKrwExact(budget)} 중{" "}
            <span className="font-bold text-cb-ink">{formatKrwExact(budget - total)}</span> 남음
          </>
        )}
      </p>
    </div>
  );
}
