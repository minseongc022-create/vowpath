import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { StatsDashboard } from "@/topik/components/stats/StatsDashboard";
import {
  getSrsStats,
  getProgress,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { computeWeeklyActivity } from "@/topik/lib/analytics/weekly-activity";
import { getLearnSession } from "@/learn/lib/auth";

export default async function TopikStatsPage() {
  const vi = await getUiStrings();
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [stats, progress] = await Promise.all([
    getSrsStats(userId),
    getProgress(userId),
  ]);
  const weekly = computeWeeklyActivity(progress);

  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.stats.title} subtitle={vi.stats.subtitle} />
      <StatsDashboard
        streak={progress.streak}
        targetLevel={progress.targetLevel}
        dueCards={stats.due}
        mastered={stats.mastered}
        total={stats.total}
        weekly={weekly}
        mockExamCount={progress.mockExamCount}
        bestMockScore={progress.bestMockScore}
      />
    </main>
  );
}
