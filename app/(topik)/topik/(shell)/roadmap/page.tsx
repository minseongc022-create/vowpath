import Link from "next/link";
import { buildStudyPlan, getTodayPlan } from "@/topik/lib/study-plan/roadmap";
import { getPlanPhase } from "@/topik/lib/academy/academy-program";
import { computePassProbability, recommendedStudyDays } from "@/topik/lib/analytics/pass-probability";
import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
import {
  countUnresolvedWrong,
  getPlanStartDate,
  getProgress,
  getSrsStats,
  resolveTopikUserId,
} from "@/topik/lib/store/file-store";
import { getRequestTopikLocale } from "@/topik/lib/i18n/request-locale";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { getLearnSession } from "@/learn/lib/auth";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";

const PHASES = [
  { id: "foundation", vi: "Giai đoạn 1 — Nền tảng", ko: "1단계 — 기초" },
  { id: "build", vi: "Giai đoạn 2 — Kỹ năng thi", ko: "2단계 — 실력 향상" },
  { id: "sprint", vi: "Giai đoạn 3 — Về đích", ko: "3단계 — 마무리" },
] as const;

export default async function AcademyRoadmapPage() {
  const session = await getLearnSession();
  const userId = resolveTopikUserId(session?.user?.id);
  const [progress, wrongCount, stats, planStart, locale, vi] = await Promise.all([
    getProgress(userId),
    countUnresolvedWrong(userId),
    getSrsStats(userId),
    getPlanStartDate(userId),
    getRequestTopikLocale(),
    getUiStrings(),
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

  const totalDays = recommendedStudyDays(report.daysToExam);
  const plan = buildStudyPlan(progress.targetLevel, totalDays);
  const today = getTodayPlan(plan, planStart);
  const currentPhase = getPlanPhase(today?.day ?? 1, totalDays);
  const ko = locale === "ko";

  return (
    <div className="topik-page topik-animate-in">
      <TopikPageHeader
        title={ko ? vi.academy.roadmapTitleKo : vi.academy.roadmapTitle}
        subtitle={ko ? vi.academy.roadmapSubKo : vi.academy.roadmapSub}
      />

      <div className="space-y-3 mb-6">
        {PHASES.map((p) => {
          const active = p.id === currentPhase;
          return (
            <div
              key={p.id}
              className={`topik-card p-4 ${active ? "ring-2 ring-learn-primary" : ""}`}
            >
              <p className="text-sm font-semibold text-learn-ink">{ko ? p.ko : p.vi}</p>
              {active && (
                <p className="mt-1 text-xs text-learn-primary font-medium">
                  {ko ? vi.academy.currentPhaseKo : vi.academy.currentPhase}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="topik-section-title mb-2">
        {vi.home.planDay.replace("{day}", String(today?.day ?? 1)).replace("{total}", String(totalDays))}
      </p>
      <ul className="topik-setup-list mb-6">
        {(today?.tasksVi ?? []).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <Link href="/topik" className="topik-btn topik-btn-primary topik-btn-lg">
        {ko ? vi.academy.backClassKo : vi.academy.backClass}
      </Link>
    </div>
  );
}
