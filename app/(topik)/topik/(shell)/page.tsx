import { HomeDashboard } from "@/topik/components/home/HomeDashboard";
import { computePassProbability, recommendedStudyDays } from "@/topik/lib/analytics/pass-probability";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
import { buildStudyJourney } from "@/topik/lib/journey/study-journey";
import { buildStudyPlan, getTodayPlan } from "@/topik/lib/study-plan/roadmap";
import {
  countUnresolvedWrong,
  getPlanStartDate,
  getProgress,
  getSrsStats,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";

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

  const journey = buildStudyJourney({
    progress,
    dueCards: stats.due,
    wrongCount,
    todayFocus: todayPlan?.focus,
    report,
  });

  return (
    <HomeDashboard
      streak={progress.streak}
      targetLevel={progress.targetLevel}
      report={report}
      todayPlan={todayPlan}
      planDay={todayPlan?.day ?? 1}
      planDays={planDays}
      srsTotal={stats.total}
      srsMastered={stats.mastered}
      journey={journey}
    />
  );
}
