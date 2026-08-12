"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/learn/components/ui/Button";

export function QuickStartForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/learn/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "YOUTUBE",
          sourceUrl: url.trim(),
          async: true,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "실패");
      if (data.id) {
        router.push(`/learn/study/${data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="w-full">
      <div className="rounded-2xl bg-learn-surface p-1 shadow-learn-md border border-learn-border">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="강의 링크 붙여넣기"
          className="h-14 w-full rounded-xl px-4 text-base outline-none placeholder:text-learn-ink-subtle"
          disabled={loading}
        />
        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={loading || !url.trim()}
        >
          {loading ? "AI 분석 시작…" : "바로 학습 시작"}
        </Button>
      </div>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </form>
  );
}
