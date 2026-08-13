import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { TOPIK_BRAND } from "@/topik/lib/brand";
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
      <section className="mb-4">
        <p className="text-sm font-medium text-learn-primary">{TOPIK_BRAND.name}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-learn-ink">
          {vi.home.greeting}
        </h1>
        <p className="mt-1.5 text-sm text-learn-ink-muted leading-relaxed">
          {vi.home.subtitle}
        </p>
      </section>

      <TodayStudyHero href={todayHref} dueCards={stats.due} firstTask={firstTask} />

      <PassProbabilitySection report={report} />

      <StudyPlanCard today={todayPlan} planDay={planDayIndex} totalDays={planDays} />

      <section className="mb-5 grid grid-cols-2 gap-3">
        <div className="topik-card p-4">
          <p className="topik-section-title">{vi.home.targetLevel}</p>
          <p className="mt-1 text-2xl font-bold text-learn-primary">TOPIK {progress.targetLevel}</p>
        </div>
        <div className="topik-card p-4">
          <p className="topik-section-title">{vi.home.streak}</p>
          <p className="mt-1 text-2xl font-bold text-[#f39c12]">
            {progress.streak}{" "}
            <span className="text-sm font-medium text-learn-ink-muted">{vi.home.days}</span>
          </p>
        </div>
      </section>

      {stats.due > 0 && (
        <Link
          href="/topik/review"
          className="topik-btn topik-btn-accent topik-btn-lg mb-5 flex items-center justify-between !rounded-2xl"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">{vi.home.startReview}</p>
            <p className="text-xs opacity-90">
              {stats.due} {vi.home.cardsDue}
            </p>
          </div>
          <span className="text-xl opacity-80">→</span>
        </Link>
      )}

      <StudyModeGrid srsTotal={stats.total} srsMastered={stats.mastered} />
    </main>
  );
}
