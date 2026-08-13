import { MalhaebokaHomeClient } from "@/topik/components/home/MalhaebokaHomeClient";
import { computePassProbability } from "@/topik/lib/analytics/pass-probability";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
import {
  countUnresolvedWrong,
  getProgress,
  getSrsStats,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikHomePage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [stats, progress, wrongCount] = await Promise.all([
    getSrsStats(userId),
    getProgress(userId),
    countUnresolvedWrong(userId),
  ]);

  const report = computePassProbability({
    progress,
    srsTotal: stats.total,
    srsMastered: stats.mastered,
    srsDue: stats.due,
    wrongUnresolved: wrongCount,
    lessonTotal: TOPIK_CURRICULUM.length,
  });

  const weeklyQuestions = stats.mastered + wrongCount;
  const weeklyMinutes = Math.round(weeklyQuestions * 1.5);

  return (
    <MalhaebokaHomeClient
      streak={progress.streak}
      report={report}
      weeklyMinutes={weeklyMinutes}
      weeklyQuestions={weeklyQuestions}
    />
  );
}
