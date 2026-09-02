"use client";

import type { PlanItemView } from "@/chaebi/lib/view";
import { formatKrwExact } from "@/chaebi/lib/format";
import { formatKoreanTime } from "@/chaebi/lib/datetime";
import { NeedIcon, SwapIcon } from "@/chaebi/components/ui/Icons";
import { StatusBadge } from "@/chaebi/components/ui/StatusBadge";

/**
 * 항목 카드 한 장.
 *
 * 카드 하나가 답해야 하는 질문은 넷이다 — 뭘 잡았나, 왜 이걸 골랐나,
 * 얼마인가, 몇 시인가. 그 넷을 넘어가면 사용자가 "내가 검토해야 하는구나"로
 * 넘어가고, 그 순간 원클릭이 아니게 된다.
 */
export function ItemCard({
  item,
  editable,
  onSwap,
  onToggle,
  highlighted,
}: {
  item: PlanItemView;
  editable: boolean;
  onSwap: (item: PlanItemView) => void;
  onToggle: (item: PlanItemView, skipped: boolean) => void;
  highlighted?: boolean;
}) {
  const catalog = item.catalog;
  const skipped = item.status === "skipped";

  if (!catalog) return null;

  return (
    <article
      className="cb-card overflow-hidden transition"
      style={{
        opacity: skipped ? 0.55 : 1,
        borderColor: highlighted ? "var(--cb-warn)" : undefined,
      }}
    >
      <div className="flex gap-3 px-4 pt-4">
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
          style={{
            background: skipped ? "var(--cb-surface-sunken)" : "var(--cb-primary-soft)",
            color: skipped ? "var(--cb-subtle)" : "var(--cb-primary)",
          }}
          aria-hidden
        >
          <NeedIcon need={item.need} className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-bold uppercase tracking-wide text-cb-subtle">
              {item.label}
            </span>
            {item.status !== "draft" ? <StatusBadge status={item.status} /> : null}
            {item.userPicked && item.status === "draft" ? (
              <span className="cb-badge" data-tone="idle">
                직접 고름
              </span>
            ) : null}
          </div>

          <h3 className="mt-1 text-[16.5px] font-extrabold leading-snug text-cb-ink">
            {catalog.name}
          </h3>
          <p className="mt-0.5 text-[12.5px] text-cb-muted">
            {catalog.category} · {catalog.regionLabel}
            {item.scheduledAt ? ` · ${formatKoreanTime(item.scheduledAt)}` : ""}
          </p>
        </div>

        <div className="flex-none text-right">
          <p className="text-[15px] font-extrabold tabular-nums text-cb-ink">
            {formatKrwExact(item.priceKrw)}
          </p>
          {catalog.perPerson ? (
            <p className="mt-0.5 text-[11px] text-cb-subtle">
              1인 {formatKrwExact(catalog.priceKrw)}
            </p>
          ) : null}
        </div>
      </div>

      {!skipped ? (
        <p className="mt-3 px-4 text-[13px] leading-relaxed text-cb-ink-soft">{item.reason}</p>
      ) : null}

      {item.replaced ? (
        <p className="mx-4 mt-3 rounded-xl bg-cb-warn-soft px-3 py-2 text-[12.5px] leading-relaxed text-cb-warn">
          원래 잡았던 <b>{item.replaced.name}</b>이(가) 마감돼 이곳으로 다시 잡았습니다.
        </p>
      ) : null}

      {item.status !== "draft" && item.statusNote ? (
        <p className="mx-4 mt-3 rounded-xl bg-cb-surface-alt px-3 py-2 text-[12.5px] leading-relaxed text-cb-ink-soft">
          {item.statusNote}
          {item.reference ? (
            <span className="ml-1 font-mono text-[11.5px] text-cb-muted">({item.reference})</span>
          ) : null}
        </p>
      ) : null}

      {editable ? (
        <div className="mt-3 flex items-stretch border-t border-cb-border">
          <button
            type="button"
            onClick={() => onSwap(item)}
            disabled={!item.alternatives.length}
            className="cb-btn cb-btn-quiet flex-1 rounded-none py-3 text-[13px] font-bold disabled:opacity-35"
          >
            <SwapIcon className="h-4 w-4" />
            다른 곳 보기
            {item.alternatives.length ? (
              <span className="text-cb-subtle">{item.alternatives.length}</span>
            ) : null}
          </button>
          <span className="w-px bg-cb-border" aria-hidden />
          <button
            type="button"
            onClick={() => onToggle(item, !skipped)}
            className="cb-btn cb-btn-quiet flex-1 rounded-none py-3 text-[13px] font-bold"
          >
            {skipped ? "다시 넣기" : "이번엔 빼기"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
