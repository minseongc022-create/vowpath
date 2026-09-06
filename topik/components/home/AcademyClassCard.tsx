"use client";

import Link from "next/link";
import type { AcademyDailyClass } from "@/topik/lib/academy/academy-program";
import { useTopikVi, useIsKoLocale } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  dailyClass: AcademyDailyClass;
};

const KIND_LABEL: Record<string, { vi: string; ko: string }> = {
  placement: { vi: "Phân lớp", ko: "반 배치" },
  lesson: { vi: "Video bài học", ko: "수업 영상" },
  drill: { vi: "Drill IBT", ko: "IBT 드릴" },
  practice: { vi: "Luyện đề", ko: "문제 풀이" },
  mock: { vi: "Thi thử", ko: "모의고사" },
  wrong: { vi: "Chữa bài", ko: "오답" },
  speaking: { vi: "Nói", ko: "말하기" },
  writing: { vi: "Viết", ko: "쓰기" },
  typing: { vi: "Gõ IBT", ko: "타이핑" },
  review: { vi: "SRS", ko: "SRS" },
};

export function AcademyClassCard({ dailyClass }: Props) {
  const vi = useTopikVi();
  const ko = useIsKoLocale();

  const totalMin = dailyClass.tasks.reduce((a, t) => a + (t.durationMin ?? 10), 0);

  return (
    <section className="topik-card mb-5 overflow-hidden topik-animate-in">
      <div className="border-b border-learn-border bg-[var(--topik-soft)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="topik-section-title">{ko ? vi.academy.classTitleKo : vi.academy.classTitle}</p>
            <p className="text-sm font-semibold text-learn-ink">
              {ko ? dailyClass.phaseTitleKo : dailyClass.phaseTitleVi}
            </p>
            <p className="text-xs text-learn-ink-muted mt-0.5">
              {ko ? dailyClass.phaseDescKo : dailyClass.phaseDescVi}
            </p>
          </div>
          <span className="topik-badge shrink-0">
            {vi.home.planDay
              .replace("{day}", String(dailyClass.planDay))
              .replace("{total}", String(dailyClass.totalDays))}
          </span>
        </div>
        <p className="mt-2 text-xs text-learn-ink-muted">
          {ko ? vi.academy.focusKo : vi.academy.focus}: {ko ? dailyClass.focusKo : dailyClass.focusVi}
          {" · ~"}
          {totalMin}
          {ko ? "분" : " phút"}
        </p>
      </div>

      <p className="px-4 pt-3 text-xs text-learn-ink-muted leading-relaxed">
        {ko ? dailyClass.coachKo : dailyClass.coachVi}
      </p>

      <ol className="space-y-0 divide-y divide-learn-border px-2 py-2">
        {dailyClass.tasks.map((task, i) => {
          const kind = KIND_LABEL[task.kind] ?? { vi: task.kind, ko: task.kind };
          return (
            <li key={task.id}>
              <Link href={task.href} className="topik-mode-row !rounded-xl">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-learn-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold uppercase text-learn-primary">
                    {ko ? kind.ko : kind.vi}
                    {task.durationMin ? ` · ${task.durationMin}${ko ? "분" : "p"}` : ""}
                  </span>
                  <span className="block text-sm font-medium text-learn-ink truncate">
                    {ko ? task.labelKo : task.labelVi}
                  </span>
                  <span className="block text-xs text-learn-ink-muted truncate">
                    {ko ? task.descKo : task.descVi}
                  </span>
                </span>
                <IconChevronRight className="shrink-0 text-learn-ink-subtle" />
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-learn-border px-4 py-3">
        <Link href="/topik/roadmap" className="text-sm font-medium text-learn-primary">
          {ko ? vi.academy.viewRoadmapKo : vi.academy.viewRoadmap} →
        </Link>
      </div>
    </section>
  );
}
