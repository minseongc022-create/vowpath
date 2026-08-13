"use client";

import Link from "next/link";
import { useState } from "react";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { MascotCharacter } from "@/topik/components/home/MascotCharacter";
import { ModeSideRail } from "@/topik/components/home/ModeSideRail";
import { IconBook, IconPen } from "@/topik/components/ui/TopikIcons";

type Props = {
  dailyGoal?: number;
  progressPct?: number;
  activeHref?: string;
};

/** Malhaeboka main hero card with mascot + side rail */
export function HeroCharacterCard({
  dailyGoal = 10,
  progressPct = 0,
  activeHref = "/topik/vocab",
}: Props) {
  const t = useTopikStrings();
  const [reminderOn, setReminderOn] = useState(false);

  return (
    <div className="topik-hero-wrap">
      <div className="topik-hero-card">
        <button
          type="button"
          className="topik-reminder-toggle"
          onClick={() => setReminderOn((v) => !v)}
          aria-pressed={reminderOn}
        >
          <span className="text-[10px] font-bold">{reminderOn ? "ON" : "OFF"}</span>
        </button>

        <div className="topik-hero-mascot">
          <MascotCharacter className="h-28 w-auto" />
        </div>

        <div className="topik-hero-meta">
          <div>
            <p className="text-base font-bold text-learn-ink">{t.modes.vocab}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-learn-ink-muted">
              {t.home.dailyGoal.replace("{n}", String(dailyGoal))}
              <IconPen size={12} />
            </p>
          </div>
          <div className="topik-hero-ring" style={{ "--pct": progressPct } as React.CSSProperties}>
            <span className="text-xs font-bold text-learn-primary">{progressPct}%</span>
          </div>
        </div>

        <Link href={activeHref} className="topik-hero-action">
          <IconBook size={18} />
          {t.home.todayVocab}
        </Link>
      </div>
      <ModeSideRail activeMode="vocab" dailyGoal={dailyGoal} progressPct={progressPct} />
    </div>
  );
}
