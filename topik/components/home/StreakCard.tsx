"use client";

import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { IconFlame } from "@/topik/components/ui/TopikIcons";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type Props = { streak: number };

/** Malhaeboka streak card — 연속 학습 */
export function StreakCard({ streak }: Props) {
  const t = useTopikStrings();
  const today = new Date().getDay();
  const mondayIndex = today === 0 ? 6 : today - 1;

  return (
    <div className="topik-streak-card">
      <div className="flex items-center gap-2">
        <span className="topik-streak-flame">
          <IconFlame />
        </span>
        <p className="text-sm font-semibold text-learn-ink">
          {t.home.streakDays.replace("{n}", String(streak))}
        </p>
      </div>
      <div className="topik-streak-days">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={`topik-streak-day ${i <= mondayIndex && streak > 0 ? "topik-streak-day-active" : ""}`}
          >
            {d}
          </span>
        ))}
        <span className="topik-streak-gift" aria-hidden>
          🎁
        </span>
      </div>
    </div>
  );
}
