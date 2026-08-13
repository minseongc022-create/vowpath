"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import type { LearningModeId } from "@/topik/lib/learning-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { ModeSideRail } from "@/topik/components/home/ModeSideRail";

type Props = {
  mode: LearningModeId;
  sessionHref: string;
};

export function ModeLanding({ mode, sessionHref }: Props) {
  const t = useTopikStrings();
  const title = t.modes[mode as keyof typeof t.modes] ?? mode;

  return (
    <main className="topik-page topik-animate-in">
      <TopikPageHeader title={title} subtitle={t.studyHub.dailyGoalItems.replace("{n}", "10")} />

      <div className="topik-hero-wrap mt-4">
        <div className="topik-study-hero-static">
          <p className="text-lg font-bold text-white">{title}</p>
          <p className="mt-2 text-sm text-white/80">{t.home.todayMode}</p>
          <Link href={sessionHref} className="topik-btn topik-btn-lg mt-6 bg-white text-learn-primary">
            {t.quiz.confirm} →
          </Link>
        </div>
        <ModeSideRail activeMode={mode} />
      </div>
    </main>
  );
}
