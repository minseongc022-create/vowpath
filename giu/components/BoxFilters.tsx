"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GIu_DISTRICTS } from "@/giu/lib/districts";
import { GIu_CATEGORIES } from "@/giu/lib/categories";
import { useGiuLocale } from "./GiuLocaleProvider";

export function BoxFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const { tt } = useGiuLocale();
  const district = params.get("district") ?? "";
  const category = params.get("category") ?? "";
  const q = params.get("q") ?? "";
  const [query, setQuery] = useState(q);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `/giu/hop?${qs}` : "/giu/hop");
  }

  function chipClass(active: boolean): string {
    return active
      ? "bg-giu-primary text-white"
      : "bg-giu-surface text-giu-muted ring-1 ring-giu-border";
  }

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          update("q", query.trim());
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tt("searchPlaceholder")}
          className="giu-input flex-1"
        />
        <button type="submit" className="rounded-2xl bg-giu-primary px-4 text-sm font-semibold text-white">
          검색
        </button>
      </form>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => update("district", "")}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${chipClass(!district)}`}
        >
          전체 구
        </button>
        {GIu_DISTRICTS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => update("district", d.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${chipClass(district === d.id)}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => update("category", "")}
          className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${chipClass(!category)}`}
        >
          전체
        </button>
        {GIu_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => update("category", c.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition ${chipClass(category === c.id)}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
