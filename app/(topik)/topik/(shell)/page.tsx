import { HomeDashboard } from "@/topik/components/home/HomeDashboard";
import { buildAcademyDailyClass } from "@/topik/lib/academy/academy-program";
import { computePassProbability, recommendedStudyDays } from "@/topik/lib/analytics/pass-probability";
import { computeWeeklyActivity } from "@/topik/lib/analytics/weekly-activity";
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
import { getRequestTopikLocale } from "@/topik/lib/i18n/request-locale";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikHomePage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [stats, progress, wrongCount, planStart, locale] = await Promise.all([
    getSrsStats(userId),
    getProgress(userId),
    countUnresolvedWrong(userId),
    getPlanStartDate(userId),
    getRequestTopikLocale(),
  ]);

  const report = computePassProbability({
    progress,
    srsTotal: stats.total,
    srsMastered: stats.mastered,
    srsDue: stats.due,
    wrongUnresolved: wrongCount,
    lessonTotal: TOPIK_CURRICULUM.length,
    locale,
  });

  const planDays = recommendedStudyDays(report.daysToExam);
  const plan = buildStudyPlan(progress.targetLevel, planDays);
  const todayPlan = getTodayPlan(plan, planStart);
  const planDay = todayPlan?.day ?? 1;

  const journey = buildStudyJourney({
    progress,
    dueCards: stats.due,
    wrongCount,
    todayFocus: todayPlan?.focus,
    report,
  });

  const dailyClass = buildAcademyDailyClass({
    progress,
    todayPlan,
    planDay,
    totalDays: planDays,
    report,
    wrongCount,
    dueCards: stats.due,
  });

  const weekly = computeWeeklyActivity(progress);

  return (
    <HomeDashboard
      streak={progress.streak}
      targetLevel={progress.targetLevel}
      report={report}
      journey={journey}
      dailyClass={dailyClass}
      weekly={weekly}
      sectionStats={progress.sectionStats}
    />
  );
}
