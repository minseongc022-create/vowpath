import { TopikHomeClient } from "@/topik/components/home/TopikHomeClient";
import { computePassProbability, recommendedStudyDays } from "@/topik/lib/analytics/pass-probability";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
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
  const todayHref = stats.due > 0 ? "/topik/review" : "/topik/vocab/session";

  return (
    <TopikHomeClient
      streak={progress.streak}
      report={report}
      todayPlan={todayPlan}
      planDay={todayPlan?.day ?? 1}
      planDays={planDays}
      dueCards={stats.due}
      todayHref={todayHref}
      firstTask={todayPlan?.tasksVi[0]}
    />
  );
}
