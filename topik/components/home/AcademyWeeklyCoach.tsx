"use client";

import type { WeeklyActivity } from "@/topik/lib/analytics/weekly-activity";
import { WEEKLY_TARGETS, weeklyPct } from "@/topik/lib/analytics/weekly-activity";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";

type Props = {
  weekly: WeeklyActivity;
};

export function AcademyWeeklyCoach({ weekly }: Props) {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  const items = [
    {
      label: vi.stats.quizSessions,
      pct: weeklyPct(weekly.quiz, WEEKLY_TARGETS.quiz),
      count: weekly.quiz,
      target: WEEKLY_TARGETS.quiz,
      color: "var(--learn-accent)",
    },
    {
      label: vi.stats.lessonsCompleted,
      pct: weeklyPct(weekly.lessons, WEEKLY_TARGETS.lessons),
      count: weekly.lessons,
      target: WEEKLY_TARGETS.lessons,
      color: "var(--topik-blue)",
    },
    {
      label: vi.stats.speakingSessions,
      pct: weeklyPct(weekly.speaking, WEEKLY_TARGETS.speaking),
      count: weekly.speaking,
      target: WEEKLY_TARGETS.speaking,
      color: "var(--learn-primary)",
    },
    {
      label: vi.stats.writingSessions,
      pct: weeklyPct(weekly.writing, WEEKLY_TARGETS.writing),
      count: weekly.writing,
      target: WEEKLY_TARGETS.writing,
      color: "var(--topik-coral)",
    },
  ];

  return (
    <section className="topik-card mb-5 p-4 topik-animate-in">
      <p className="topik-section-title">{ko ? vi.academy.weeklyTitleKo : vi.academy.weeklyTitle}</p>
      <p className="mb-3 text-xs text-learn-ink-muted">
        {ko ? vi.academy.weeklyHintKo : vi.academy.weeklyHint}
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-learn-ink-muted">{item.label}</span>
              <span className="font-semibold text-learn-ink">
                {item.count}/{item.target}
              </span>
            </div>
            <div className="topik-stat-bar-track h-2 rounded-full bg-learn-muted">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${item.pct}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
