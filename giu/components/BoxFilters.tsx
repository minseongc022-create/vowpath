"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GIu_DISTRICTS } from "@/giu/lib/districts";
import { GIu_CATEGORIES } from "@/giu/lib/categories";

export function BoxFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const district = params.get("district") ?? "";
  const category = params.get("category") ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const q = next.toString();
    router.push(q ? `/giu/hop?${q}` : "/giu/hop");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={district}
        onChange={(e) => update("district", e.target.value)}
        className="rounded-xl border border-giu-border bg-white px-3 py-2 text-sm"
      >
        <option value="">Tất cả quận</option>
        {GIu_DISTRICTS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <select
        value={category}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-xl border border-giu-border bg-white px-3 py-2 text-sm"
      >
        <option value="">Tất cả loại</option>
        {GIu_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.emoji} {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
