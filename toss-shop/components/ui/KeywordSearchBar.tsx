"use client";

import { useRouter } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

export function KeywordSearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();

  function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = String(fd.get("q") ?? "").trim();
    if (!q) return;
    router.push(`${SP_ROUTES.keywords}?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={search} className="ts-search-bar">
      <svg className="h-5 w-5 shrink-0 text-ts-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3-3" strokeLinecap="round" />
      </svg>
      <input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="키워드를 검색하세요"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ts-muted"
        autoComplete="off"
      />
      <button type="submit" className="ts-search-submit">
        분석
      </button>
    </form>
  );
}
