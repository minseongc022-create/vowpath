"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { merchantDistricts } from "@/giu/lib/districts";
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
      ? "bg-giu-ink text-white"
      : "bg-white/75 text-giu-muted ring-1 ring-giu-border";
  }

  return (
    <div className="space-y-2.5">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          update("q", query.trim());
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tt("searchPlaceholder")}
          className="giu-input pr-16"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[10px] bg-giu-primary px-3 py-1.5 text-[12px] font-bold text-white"
        >
          {tt("search")}
        </button>
      </form>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => update("district", "")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${chipClass(!district)}`}
        >
          {tt("allDistricts")}
        </button>
        {merchantDistricts().map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => update("district", d.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${chipClass(district === d.id)}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => update("category", "")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${chipClass(!category)}`}
        >
          {tt("allCategories")}
        </button>
        {GIu_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => update("category", c.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${chipClass(category === c.id)}`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
