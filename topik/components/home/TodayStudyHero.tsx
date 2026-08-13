import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  href: string;
  dueCards: number;
  firstTask?: string;
};

/** Malhaeboka "오늘의 학습" — one-tap start for today's priority */
export function TodayStudyHero({ href, dueCards, firstTask }: Props) {
  return (
    <Link href={href} className="topik-hero-cta mb-5 block topik-animate-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium opacity-90">{vi.home.todayStudy}</p>
          <p className="mt-1 text-xl font-bold tracking-tight">
            {dueCards > 0 ? vi.home.startReview : vi.home.continueStudy}
          </p>
          {firstTask && (
            <p className="mt-1.5 text-xs opacity-80 line-clamp-1">{firstTask}</p>
          )}
          {dueCards > 0 && (
            <p className="mt-2 inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
              {dueCards} {vi.home.cardsDue}
            </p>
          )}
        </div>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
          <IconChevronRight className="text-white" />
        </span>
      </div>
    </Link>
  );
}
