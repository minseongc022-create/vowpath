"use client";

import Link from "next/link";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";

type Props = {
  planDay: number;
  totalDays: number;
  phaseTitleVi: string;
  phaseTitleKo: string;
  lessonsDone: number;
  lessonsTotal: number;
  daysToExam: number | null;
};

/** Education progress banner — no pricing/marketing stats */
export function AcademyProgressHero({
  planDay,
  totalDays,
  phaseTitleVi,
  phaseTitleKo,
  lessonsDone,
  lessonsTotal,
  daysToExam,
}: Props) {
  const vi = useTopikVi();
  const ko = useIsKoLocale();
  const lessonPct = lessonsTotal > 0 ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  return (
    <section className="topik-card-soft mb-4 overflow-hidden topik-animate-in">
      <div className="bg-gradient-to-br from-[#2d4a6f] via-learn-primary to-[#5a9a6f] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
          {ko ? vi.academy.badgeKo : vi.academy.badge}
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug">
          {ko ? phaseTitleKo : phaseTitleVi}
        </h2>
        <p className="mt-2 text-sm opacity-90 leading-relaxed">
          {ko ? vi.academy.progressSubKo : vi.academy.progressSub}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/15 px-2 py-2 text-center">
            <p className="text-base font-bold">
              {vi.home.planDay.replace("{day}", String(planDay)).replace("{total}", String(totalDays))}
            </p>
            <p className="text-[10px] leading-tight opacity-90">{ko ? vi.academy.statRoadmapKo : vi.academy.statRoadmap}</p>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2 text-center">
            <p className="text-base font-bold">{lessonPct}%</p>
            <p className="text-[10px] leading-tight opacity-90">
              {ko ? vi.academy.statLessonsKo : vi.academy.statLessons}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-2 py-2 text-center">
            <p className="text-base font-bold">{daysToExam ?? "—"}</p>
            <p className="text-[10px] leading-tight opacity-90">
              {ko ? vi.academy.statExamKo : vi.academy.statExam}
            </p>
          </div>
        </div>
        <Link
          href="/topik/roadmap"
          className="mt-3 inline-block text-xs font-semibold underline underline-offset-2 opacity-95"
        >
          {ko ? vi.academy.viewRoadmapKo : vi.academy.viewRoadmap} →
        </Link>
      </div>
    </section>
  );
}
