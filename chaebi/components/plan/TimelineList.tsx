import type { PlanItemView } from "@/chaebi/lib/view";
import type { TimelineEntry } from "@/chaebi/lib/types";
import { formatKoreanTime } from "@/chaebi/lib/datetime";
import { CheckIcon } from "@/chaebi/components/ui/Icons";

/**
 * 당일 동선.
 *
 * ★ 이 화면이 제품의 핵심 증거다
 *
 * 다른 앱들은 "예약 완료"까지만 책임진다. 케이크를 몇 시에 찾아야 저녁 예약에
 * 늦지 않는지는 사용자가 스스로 계산한다. 여기서는 그 계산을 대신 해서
 * 시간순으로 깔아둔다 — 사용자가 그날 할 일은 이 목록을 위에서 아래로
 * 따라가는 것뿐이다.
 */
export function TimelineList({
  entries,
  items,
}: {
  entries: TimelineEntry[];
  items: PlanItemView[];
}) {
  if (!entries.length) return null;

  const statusById = new Map(items.map((item) => [item.id, item.status]));

  return (
    <ol className="space-y-4">
      {entries.map((entry, index) => {
        const status = entry.itemId ? statusById.get(entry.itemId) : undefined;
        const done = status === "done";
        const last = index === entries.length - 1;

        return (
          <li key={`${entry.at}-${entry.title}`} className="relative flex gap-3">
            {!last ? <span className="cb-timeline-line" aria-hidden /> : null}
            <span className="cb-timeline-node mt-1" data-done={done} aria-hidden>
              {done ? <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3.6} /> : null}
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <p className="text-[12.5px] font-bold tabular-nums text-cb-primary">
                {formatKoreanTime(entry.at)}
              </p>
              <p className="mt-0.5 text-[14.5px] font-bold leading-snug text-cb-ink">
                {entry.title}
              </p>
              {entry.detail ? (
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-cb-muted">{entry.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
