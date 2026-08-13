"use client";

import Link from "next/link";
import { SkillGrid, TopikToolsRow } from "@/topik/components/home/SkillGrid";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import { StudyPlanCard } from "@/topik/components/dashboard/StudyPlanCard";
import { IconFlame, IconChevronRight } from "@/topik/components/ui/TopikIcons";
import { vi } from "@/topik/lib/i18n/vi";
import type { PassProbabilityReport } from "@/topik/types";
import type { StudyPlanDay } from "@/topik/types";

type Props = {
  streak: number;
  report: PassProbabilityReport;
  todayPlan: StudyPlanDay | null;
  planDay: number;
  planDays: number;
  dueCards: number;
  todayHref: string;
  firstTask?: string;
};

/** TOPIK-first home — mission-driven, not Malhaeboka clone */
export function TopikHomeClient({
  streak,
  report,
  todayPlan,
  planDay,
  planDays,
  dueCards,
  todayHref,
  firstTask,
}: Props) {
  const missionText =
    dueCards > 0
      ? `${dueCards} thẻ SRS cần ôn`
      : firstTask ?? vi.home.continueStudy;

  return (
    <main className="topik-page topik-animate-in">
      <div className="topik-home-greeting">
        <div>
          <h1>{vi.home.greeting}</h1>
          <p className="text-sm text-learn-ink-muted">{vi.home.subtitle}</p>
        </div>
        {streak > 0 && (
          <span className="topik-streak-inline">
            <IconFlame />
            {streak} {vi.home.days}
          </span>
        )}
      </div>

      <Link href={todayHref} className="topik-mission-card">
        <p className="text-sm font-medium opacity-90">{vi.home.todayStudy}</p>
        <p className="mt-1 text-lg font-bold">{missionText}</p>
        <div className="mt-3 flex items-center gap-1 text-sm font-semibold opacity-90">
          {vi.home.continueStudy}
          <IconChevronRight className="text-white" />
        </div>
      </Link>

      <StudyPlanCard today={todayPlan} planDay={planDay} totalDays={planDays} />

      <PassProbabilitySection report={report} />

      <p className="topik-section-title mb-2 mt-5">5 kỹ năng cốt lõi</p>
      <SkillGrid />

      <TopikToolsRow />

      <Link href="/topik/study" className="topik-btn topik-btn-outline topik-btn-md mt-4 w-full">
        {vi.stats.allModes}
      </Link>
    </main>
  );
}
