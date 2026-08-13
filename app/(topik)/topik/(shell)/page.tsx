import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import {
  getSrsStats,
  getProgress,
  resolveTopikUserId,
  countUnresolvedWrong,
  getPlanStartDate,
} from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";
import { computePassProbability, recommendedStudyDays } from "@/topik/lib/analytics/pass-probability";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
import { buildStudyPlan, getTodayPlan } from "@/topik/lib/study-plan/roadmap";
import { PassProbabilitySection } from "@/topik/components/dashboard/PassProbabilitySection";
import { StudyPlanCard } from "@/topik/components/dashboard/StudyPlanCard";
import { TodayStudyHero } from "@/topik/components/home/TodayStudyHero";
import { StudyModeGrid } from "@/topik/components/home/StudyModeGrid";

export default async function TopikHomePage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [stats, progress, wrongCount, planStart] = await Promise.all([
    getSrsStats(userId),
    getProgress(userId),
    countUnresolvedWrong(userId),
    getPlanStartDate(userId),
  ]);

  const report = computePassProbability({
    progress,
    srsTotal: stats.total,
    srsMastered: stats.mastered,
    srsDue: stats.due,
    wrongUnresolved: wrongCount,
    lessonTotal: TOPIK_CURRICULUM.length,
  });

  const planDays = recommendedStudyDays(report.daysToExam);
  const plan = buildStudyPlan(progress.targetLevel, planDays);
  const todayPlan = getTodayPlan(plan, planStart);
  const planDayIndex = todayPlan?.day ?? 1;

  const todayHref = stats.due > 0 ? "/topik/review" : "/topik/study";
  const firstTask = todayPlan?.tasksVi[0];

  return (
    <main className="topik-page topik-animate-in">
      <TodayStudyHero href={todayHref} dueCards={stats.due} firstTask={firstTask} />

      <section className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="topik-stat-chip">
          <p className="topik-section-title">{vi.home.targetLevel}</p>
          <p className="mt-0.5 text-xl font-bold text-learn-primary">TOPIK {progress.targetLevel}</p>
        </div>
        <div className="topik-stat-chip">
          <p className="topik-section-title">{vi.home.streak}</p>
          <p className="mt-0.5 text-xl font-bold text-[var(--topik-gold)]">
            {progress.streak}
            <span className="ml-0.5 text-sm font-medium text-learn-ink-muted">{vi.home.days}</span>
          </p>
        </div>
      </section>

      <StudyPlanCard today={todayPlan} planDay={planDayIndex} totalDays={planDays} />

      <PassProbabilitySection report={report} />

      <StudyModeGrid srsTotal={stats.total} srsMastered={stats.mastered} />

      <Link href="/topik/study" className="topik-btn topik-btn-outline topik-btn-md mt-2 w-full">
        {vi.stats.allModes}
      </Link>
    </main>
  );
}
