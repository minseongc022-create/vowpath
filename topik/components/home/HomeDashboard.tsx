"use client";

import Link from "next/link";
import { TodayStudyHero } from "@/topik/components/home/TodayStudyHero";
import { StudyModeGrid } from "@/topik/components/home/StudyModeGrid";
import { OfficialResourcesCard } from "@/topik/components/home/OfficialResourcesCard";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import { StudyPlanCard } from "@/topik/components/dashboard/StudyPlanCard";
import { vi } from "@/topik/lib/i18n/vi";
import type { PassProbabilityReport, StudyPlanDay } from "@/topik/types";

type Props = {
  streak: number;
  targetLevel: number;
  report: PassProbabilityReport;
  todayPlan: StudyPlanDay | null;
  planDay: number;
  planDays: number;
  dueCards: number;
  srsTotal: number;
  srsMastered: number;
  todayHref: string;
  firstTask?: string;
};

/** TOPIK Master home — pass probability, daily plan, core study modes */
export function HomeDashboard({
  streak,
  targetLevel,
  report,
  todayPlan,
  planDay,
  planDays,
  dueCards,
  srsTotal,
  srsMastered,
  todayHref,
  firstTask,
}: Props) {
  return (
    <main className="topik-page topik-animate-in">
      <header className="topik-home-header lg:hidden">
        <h1 className="topik-home-title">{vi.home.greeting}</h1>
        <p className="topik-home-subtitle">{vi.home.subtitle}</p>
      </header>

      <TodayStudyHero href={todayHref} dueCards={dueCards} firstTask={firstTask} />

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

      <StudyModeGrid srsTotal={srsTotal} srsMastered={srsMastered} />

      <StudyPlanCard today={todayPlan} planDay={planDay} totalDays={planDays} />

      <PassProbabilitySection report={report} />

      <OfficialResourcesCard />

      <Link href="/topik/study" className="topik-btn topik-btn-outline topik-btn-lg">
        {vi.stats.allModes}
      </Link>
    </main>
  );
}
