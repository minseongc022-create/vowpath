"use client";

import Link from "next/link";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  href: string;
  dueCards: number;
  firstTask?: string;
};

export function TodayStudyHero({ href, dueCards, firstTask }: Props) {
  const vi = useTopikVi();

  return (
    <Link href={href} className="topik-today-hero">
      <div className="topik-today-hero-body">
        <p className="topik-today-hero-label">{vi.home.todayStudy}</p>
        <p className="topik-today-hero-title">
          {dueCards > 0 ? vi.home.startReview : vi.home.continueStudy}
        </p>
        {firstTask && <p className="topik-today-hero-task">{firstTask}</p>}
        {dueCards > 0 && (
          <p className="topik-today-hero-meta">
            {dueCards} {vi.home.cardsDue}
          </p>
        )}
      </div>
      <span className="topik-today-hero-action" aria-hidden>
        <IconChevronRight className="text-white" />
      </span>
    </Link>
  );
}
