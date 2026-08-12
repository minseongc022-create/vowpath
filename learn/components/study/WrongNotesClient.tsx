"use client";

import { useEffect, useState } from "react";
import type { QuizEvidence, WrongAnswerRecord } from "@/learn/types/quiz";
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

  function backtrackUrl(item: WrongAnswerRecord): string {
    const params = new URLSearchParams();
    if (item.evidence?.startSec !== undefined) params.set("seek", String(item.evidence.startSec));
    if (item.evidence?.lineId) params.set("line", item.evidence.lineId);
    if (item.evidence?.nodeId) params.set("node", item.evidence.nodeId);
    const qs = params.toString();
    return `/learn/study/${item.materialId}${qs ? `?${qs}` : ""}`;
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
      <p className="text-xs text-learn-ink-muted">
        틀린 이유를 자료 원문까지 역추적해 복습하세요
      </p>
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-learn-border bg-learn-surface p-4 shadow-learn-sm"
        >
          <p className="text-xs font-medium text-learn-primary">{item.materialTitle}</p>
          <h3 className="mt-1 text-sm font-bold text-learn-ink">{item.question}</h3>

          {item.type === "multiple_choice" && item.options && (
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
          )}

          {item.type === "short_answer" && (
            <div className="mt-3 space-y-1.5 text-xs">
              <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 line-through">
                내 답: {item.textAnswer || "(미입력)"}
              </p>
              <p className="rounded-lg bg-green-50 px-3 py-2 text-green-800 font-semibold">
                정답: {item.correctAnswer}
              </p>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-learn-ink-muted">💡 {item.explanation}</p>

          {item.evidence?.snippet && (
            <div className="mt-3 rounded-xl bg-learn-muted/60 p-3">
              <p className="text-[10px] font-bold text-learn-primary">근거 원문</p>
              <p className="mt-1 text-xs italic text-learn-ink-muted">&ldquo;{item.evidence.snippet}&rdquo;</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Link
              href={backtrackUrl(item)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-learn-primary px-4 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform"
            >
              <span>📍</span>
              <span>근거 위치로 바로 이동</span>
            </Link>
            <div className="flex gap-2">
              <Link href={`/learn/study/${item.materialId}`} className="flex-1">
                <Button size="sm" variant="secondary" className="w-full">다시 학습</Button>
              </Link>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => void resolve(item.id)}>
                이해했어요
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
