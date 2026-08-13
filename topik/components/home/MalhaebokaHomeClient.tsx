"use client";

import Link from "next/link";
import { StreakCard } from "@/topik/components/home/StreakCard";
import { HeroCharacterCard } from "@/topik/components/home/HeroCharacterCard";
import { HomeQuickLinks, LearningInfoCard } from "@/topik/components/home/HomeQuickLinks";
import { LevelMeasureCard } from "@/topik/components/home/LevelMeasureCard";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import type { PassProbabilityReport } from "@/topik/types";

type Props = {
  streak: number;
  report: PassProbabilityReport;
  weeklyMinutes?: number;
  weeklyQuestions?: number;
};

/** Malhaeboka-style home dashboard */
export function MalhaebokaHomeClient({
  streak,
  report,
  weeklyMinutes = 0,
  weeklyQuestions = 0,
}: Props) {
  const progressPct = Math.min(100, report.probability);

  return (
    <main className="topik-page topik-animate-in">
      <StreakCard streak={streak} />

      <div className="mt-3">
        <HeroCharacterCard dailyGoal={10} progressPct={progressPct} activeHref="/topik/vocab/session" />
      </div>

      <LinkBanner />

      <LearningInfoCard weeklyMinutes={weeklyMinutes} weeklyQuestions={weeklyQuestions} />

      <div className="mt-4">
        <LevelMeasureCard pct={Math.round(report.probability)} />
      </div>

      <HomeQuickLinks />

      <div className="mt-4">
        <PassProbabilitySection report={report} />
      </div>
    </main>
  );
}

function LinkBanner() {
  return (
    <Link href="/topik/premium" className="topik-promo-banner my-4 block">
      <p className="text-sm font-semibold text-white">Tiết kiệm học phí Premium — xem cách nhận ưu đãi</p>
      <span className="topik-promo-mascot" aria-hidden>
        🎓
      </span>
    </Link>
  );
}
