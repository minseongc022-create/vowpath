"use client";

import { useEffect, useState } from "react";
import type { DailyActivity, QuizAttempt } from "@/learn/types/quiz";
import Link from "next/link";

export function CalendarClient() {
  const [calendar, setCalendar] = useState<DailyActivity[]>([]);
  const [recent, setRecent] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/learn/api/activity?days=14")
      .then((r) => r.json())
      .then((d) => {
        setCalendar(d.calendar ?? []);
        setRecent(d.recent ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = calendar[0];
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  if (loading) {
    return <p className="py-12 text-center text-sm text-learn-ink-muted">불러오는 중…</p>;
  }

  return (
    <div className="space-y-6 learn-animate-in">
      <section className="rounded-2xl bg-learn-primary p-5 text-white shadow-learn-md">
        <p className="text-sm opacity-90">{todayLabel}</p>
        <h2 className="mt-1 text-2xl font-bold">오늘의 학습</h2>
        {today && (today.materialTitles.length > 0 || today.quizAttempts > 0) ? (
          <div className="mt-4 space-y-2">
            {today.materialTitles.map((t, i) => (
              <p key={i} className="text-sm font-medium">📺 {t}</p>
            ))}
            {today.quizAttempts > 0 && (
              <p className="text-sm">
                📝 퀴즈 {today.quizAttempts}회 · 정답률 {today.avgScore ?? 0}%
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm opacity-80">아직 오늘 학습 기록이 없어요</p>
        )}
        <Link
          href="/learn"
          className="mt-4 inline-flex rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur"
        >
          영상 추가하기 →
        </Link>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold text-learn-ink">최근 2주</h3>
        <div className="grid grid-cols-7 gap-1.5">
          {calendar.slice(0, 14).reverse().map((day) => {
            const hasActivity = day.materialTitles.length > 0 || day.quizAttempts > 0;
            const d = new Date(day.date + "T12:00:00");
            return (
              <div
                key={day.date}
                className={`flex flex-col items-center rounded-xl p-2 text-center ${
                  hasActivity ? "bg-learn-primary/10" : "bg-learn-muted/50"
                }`}
                title={day.date}
              >
                <span className="text-[10px] text-learn-ink-subtle">
                  {d.getDate()}
                </span>
                {hasActivity && (
                  <span className="mt-0.5 text-[9px] font-bold text-learn-primary">
                    {day.avgScore !== null ? `${day.avgScore}%` : "✓"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold text-learn-ink">최근 퀴즈</h3>
          <div className="space-y-2">
            {recent.map((a) => (
              <Link
                key={a.id}
                href={`/learn/study/${a.materialId}`}
                className="flex items-center justify-between rounded-xl border border-learn-border bg-learn-surface px-4 py-3"
              >
                <span className="truncate text-sm font-medium text-learn-ink">{a.materialTitle}</span>
                <span className="shrink-0 text-sm font-bold text-learn-primary">
                  {a.score}/{a.total}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
