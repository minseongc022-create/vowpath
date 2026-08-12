"use client";

import { useEffect, useState } from "react";
import type { WrongAnswerRecord } from "@/learn/types/quiz";
import { Button } from "@/learn/components/ui/Button";
import Link from "next/link";

export function WrongNotesClient() {
  const [items, setItems] = useState<WrongAnswerRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/learn/api/wrong-notes")
      .then((r) => r.json())
      .then((d) => setItems(d))
      .finally(() => setLoading(false));
  }, []);

  async function resolve(id: string) {
    await fetch("/learn/api/wrong-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-learn-ink-muted">불러오는 중…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center learn-animate-in">
        <span className="text-4xl">✨</span>
        <p className="mt-4 text-lg font-bold text-learn-ink">오답이 없어요</p>
        <p className="mt-1 text-sm text-learn-ink-muted">퀴즈를 풀면 틀린 문제가 자동 저장됩니다</p>
        <Link href="/learn" className="mt-6 inline-block">
          <Button>학습 시작하기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 learn-animate-in">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-learn-border bg-learn-surface p-4 shadow-learn-sm"
        >
          <p className="text-xs font-medium text-learn-primary">{item.materialTitle}</p>
          <h3 className="mt-1 text-sm font-bold text-learn-ink">{item.question}</h3>
          <div className="mt-3 space-y-1.5">
            {item.options.map((opt, i) => (
              <p
                key={i}
                className={`rounded-lg px-3 py-2 text-xs ${
                  i === item.correctIndex
                    ? "bg-green-50 text-green-800 font-semibold"
                    : i === item.selectedIndex
                      ? "bg-red-50 text-red-700 line-through"
                      : "bg-learn-muted text-learn-ink-muted"
                }`}
              >
                {opt}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-learn-ink-muted">
            💡 {item.explanation}
          </p>
          <div className="mt-3 flex gap-2">
            <Link href={`/learn/study/${item.materialId}`}>
              <Button size="sm" variant="secondary">다시 학습</Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={() => void resolve(item.id)}>
              이해했어요
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
