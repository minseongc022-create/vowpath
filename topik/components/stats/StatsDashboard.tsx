import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  streak: number;
  targetLevel: number;
  dueCards: number;
  mastered: number;
  total: number;
};

export function StatsDashboard({ streak, targetLevel, dueCards, mastered, total }: Props) {
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const stats = [
    { label: vi.stats.streak, value: `${streak}`, unit: vi.home.days, color: "var(--topik-streak)", pct: Math.min(streak * 10, 100) },
    { label: vi.stats.targetLevel, value: `TOPIK ${targetLevel}`, unit: "", color: "var(--learn-primary)", pct: (targetLevel / 6) * 100 },
    { label: vi.stats.srsMastered, value: `${mastered}`, unit: `/ ${total}`, color: "var(--learn-accent)", pct: masteryPct },
    { label: vi.stats.dueToday, value: `${dueCards}`, unit: vi.stats.cards, color: "var(--learn-primary)", pct: total > 0 ? Math.min((dueCards / total) * 100, 100) : 0 },
  ];

  return (
    <div className="space-y-4 topik-animate-in">
      <section className="topik-card-soft p-5">
        <p className="topik-section-title mb-1">{vi.stats.overview}</p>
        <p className="text-2xl font-bold text-learn-ink">{vi.stats.keepGoing}</p>
        <p className="mt-1 text-sm text-learn-ink-muted">{vi.stats.overviewHint}</p>
      </section>

      <section className="topik-stats-grid grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="topik-card p-4">
            <p className="text-[11px] font-semibold text-learn-ink-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-learn-ink">
              {s.value}
              {s.unit && <span className="ml-0.5 text-sm font-medium text-learn-ink-muted">{s.unit}</span>}
            </p>
            <div className="topik-stat-bar mt-3">
              <div className="topik-stat-bar-track">
                <div
                  className="topik-stat-bar-fill"
                  style={{ width: `${s.pct}%`, background: s.color }}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="topik-card p-4">
        <p className="topik-section-title mb-3">{vi.stats.weeklyGoal}</p>
        <div className="space-y-3">
          {[
            { label: vi.stats.speakingSessions, pct: 40, color: "var(--learn-primary)" },
            { label: vi.stats.writingSessions, pct: 25, color: "var(--topik-coral)" },
            { label: vi.stats.quizSessions, pct: 60, color: "var(--learn-accent)" },
            { label: vi.stats.lessonsCompleted, pct: 35, color: "var(--topik-blue)" },
          ].map((item) => (
            <div key={item.label} className="topik-stat-bar">
              <span className="w-28 shrink-0 text-xs text-learn-ink-muted">{item.label}</span>
              <div className="topik-stat-bar-track">
                <div
                  className="topik-stat-bar-fill"
                  style={{ width: `${item.pct}%`, background: item.color }}
                />
              </div>
              <span className="w-8 text-right text-xs font-semibold text-learn-ink-muted">{item.pct}%</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/topik/review" className="topik-btn topik-btn-primary topik-btn-md">
          {vi.stats.startReview}
        </Link>
        <Link href="/topik/study" className="topik-btn topik-btn-outline topik-btn-md">
          {vi.stats.allModes}
        </Link>
      </div>
    </div>
  );
}
