"use client";

import { AcademyHeroSection } from "@/topik/components/home/AcademyHeroSection";
import { AcademyClassCard } from "@/topik/components/home/AcademyClassCard";
import { AcademyWeeklyCoach } from "@/topik/components/home/AcademyWeeklyCoach";
import { AcademyCompareSection } from "@/topik/components/home/AcademyCompareSection";
import { StudyJourneyCard } from "@/topik/components/home/StudyJourneyCard";
import { WeakAreaDrillCard } from "@/topik/components/home/WeakAreaDrillCard";
import { StudyModeGrid } from "@/topik/components/home/StudyModeGrid";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";
import type { AcademyDailyClass } from "@/topik/lib/academy/academy-program";
import type { WeeklyActivity } from "@/topik/lib/analytics/weekly-activity";
import type { PassProbabilityReport, TopikLevel } from "@/topik/types";
import type { StudyJourney } from "@/topik/lib/journey/study-journey";

type Props = {
  streak: number;
  targetLevel: number;
  report: PassProbabilityReport;
  journey: StudyJourney;
  dailyClass: AcademyDailyClass;
  weekly: WeeklyActivity;
  sectionStats?: Record<string, { correct: number; total: number }>;
};

/** TOPIK home — online academy: daily class, coach, vs hagwon positioning */
export function HomeDashboard({
  streak,
  targetLevel,
  report,
  journey,
  dailyClass,
  weekly,
  sectionStats,
}: Props) {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  return (
    <main className="topik-page topik-animate-in">
      <header className="topik-home-header lg:hidden">
        <h1 className="topik-home-title">{vi.home.greeting}</h1>
        <p className="topik-home-subtitle">{vi.home.subtitle}</p>
      </header>

      <AcademyHeroSection />

      <AcademyClassCard dailyClass={dailyClass} />

      <StudyJourneyCard journey={journey} />

      <AcademyWeeklyCoach weekly={weekly} />

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

      {report.dailyPlanVi.length > 0 && (
        <section className="topik-card mb-5 p-4 topik-animate-in">
          <p className="topik-section-title">
            {ko ? vi.academy.coachChecklistKo : vi.academy.coachChecklist}
          </p>
          <ul className="topik-setup-list mt-2">
            {report.dailyPlanVi.slice(0, 5).map((tip) => (
              <li key={tip} className="text-sm text-learn-ink-muted">
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AcademyCompareSection />
    </main>
  );
}
