"use client";

import Link from "next/link";
import { StudyJourneyCard } from "@/topik/components/home/StudyJourneyCard";
import { WeakAreaDrillCard } from "@/topik/components/home/WeakAreaDrillCard";
import { StudyModeGrid } from "@/topik/components/home/StudyModeGrid";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import type { PassProbabilityReport, TopikLevel } from "@/topik/types";
import type { StudyJourney } from "@/topik/lib/journey/study-journey";

type Props = {
  streak: number;
  targetLevel: number;
  report: PassProbabilityReport;
  journey: StudyJourney;
  sectionStats?: Record<string, { correct: number; total: number }>;
  placementDone?: boolean;
};

/** TOPIK home — core exam prep: diagnostic, drill, mock, wrong notes */
export function HomeDashboard({
  streak,
  targetLevel,
  report,
  journey,
  sectionStats,
  placementDone,
}: Props) {
  const vi = useTopikVi();
  return (
    <main className="topik-page topik-animate-in">
      <header className="topik-home-header lg:hidden">
        <h1 className="topik-home-title">{vi.home.greeting}</h1>
        <p className="topik-home-subtitle">{vi.home.subtitle}</p>
      </header>

      {!placementDone && (
        <Link href="/topik/placement" className="topik-today-hero mb-4">
          <div className="topik-today-hero-body">
            <p className="topik-today-hero-label">{vi.placement.bannerLabel}</p>
            <p className="topik-today-hero-title">{vi.placement.title}</p>
            <p className="topik-today-hero-task">{vi.placement.bannerDesc}</p>
          </div>
        </Link>
      )}

      <StudyJourneyCard journey={journey} />

      <WeakAreaDrillCard sectionStats={sectionStats} targetLevel={targetLevel as TopikLevel} />

      <div className="topik-home-stats">
        <div className="topik-stat-chip">
          <p className="topik-section-title">{vi.home.targetLevel}</p>
          <p className="topik-stat-value">TOPIK {targetLevel}</p>
        </div>
        <div className="topik-stat-chip">
          <p className="topik-section-title">{vi.home.streak}</p>
          <p className="topik-stat-value">
            {streak}
            <span className="topik-stat-unit">{vi.home.days}</span>
          </p>
        </div>
      </div>

      <StudyModeGrid />

      <PassProbabilitySection report={report} />
    </main>
  );
}
