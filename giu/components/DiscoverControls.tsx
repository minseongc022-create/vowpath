"use client";

import { useRouter, useSearchParams } from "next/navigation";

function chip(active: boolean) {
  return active
    ? "bg-giu-ink text-white"
    : "bg-white/80 text-giu-muted ring-1 ring-giu-border";
}

export function DiscoverControls() {
  const router = useRouter();
  const params = useSearchParams();
  const when = params.get("when") ?? "all";
  const view = params.get("view") ?? "list";
  const sort = params.get("sort") ?? "soon";
  const sold = params.get("sold") === "1";

  function patch(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.push(qs ? `/giu/hop?${qs}` : "/giu/hop");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => patch({ when: null })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(when === "all")}`}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => patch({ when: "today" })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(when === "today")}`}
        >
          오늘
        </button>
        <button
          type="button"
          onClick={() => patch({ when: "tomorrow" })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(when === "tomorrow")}`}
        >
          내일
        </button>
        <button
          type="button"
          onClick={() => patch({ sold: sold ? null : "1" })}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(sold)}`}
        >
          매진 포함
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => patch({ view: null })}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(view === "list")}`}
          >
            목록
          </button>
          <button
            type="button"
            onClick={() => patch({ view: "map" })}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${chip(view === "map")}`}
          >
            지도
          </button>
        </div>
        <select
          value={sort}
          onChange={(e) => patch({ sort: e.target.value === "soon" ? null : e.target.value })}
          className="rounded-full bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-giu-ink ring-1 ring-giu-border"
        >
          <option value="soon">픽업 임박</option>
          <option value="price">낮은 가격</option>
          <option value="discount">할인율</option>
        </select>
      </div>
    </div>
  );
}
