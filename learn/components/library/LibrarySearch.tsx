"use client";

import { useCallback, useState } from "react";
import type { MaterialRecord } from "@/learn/types/material";
import { LibraryMaterialCard } from "@/learn/components/library/LibraryMaterialCard";

export function LibrarySearch({
  initialMaterials,
}: {
  initialMaterials: MaterialRecord[];
}) {
  const [query, setQuery] = useState("");
  const [materials, setMaterials] = useState(initialMaterials);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const url = q.trim()
        ? `/learn/api/library?q=${encodeURIComponent(q.trim())}`
        : "/learn/api/library";
      const res = await fetch(url);
      if (res.ok) {
        setMaterials((await res.json()) as MaterialRecord[]);
      }
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <div>
      <div className="relative mb-6">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void search(e.target.value);
          }}
          placeholder="저장소 전체 검색 — 제목, 스크립트, 요약, 태그"
          className="h-12 w-full rounded-2xl border border-learn-border bg-learn-surface pl-11 pr-4 text-sm outline-none focus:border-learn-primary/50"
        />
        <svg
          className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-learn-ink-subtle"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        {searching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-learn-ink-subtle">
            검색 중…
          </span>
        )}
      </div>

      {materials.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-learn-border p-10 text-center text-sm text-learn-ink-muted">
          {query ? "검색 결과가 없습니다." : "아직 저장된 자료가 없습니다. 위에서 추가해 보세요."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {materials.map((m) => (
            <LibraryMaterialCard key={m.id} material={m} />
          ))}
        </div>
      )}
    </div>
  );
}
