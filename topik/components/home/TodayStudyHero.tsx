import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  href: string;
  dueCards: number;
  firstTask?: string;
};

/** Malhaeboka "오늘의 학습" — full-width primary CTA */
export function TodayStudyHero({ href, dueCards, firstTask }: Props) {
  return (
    <Link href={href} className="topik-hero-cta mb-4 block">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium opacity-90">{vi.home.todayStudy}</p>
          <p className="mt-1 text-lg font-bold tracking-tight">
            {dueCards > 0 ? vi.home.startReview : vi.home.continueStudy}
          </p>
          {firstTask && (
            <p className="mt-1 text-xs opacity-80 line-clamp-1">{firstTask}</p>
          )}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
          <IconChevronRight className="text-white" />
        </span>
      </div>
      {dueCards > 0 && (
        <p className="mt-3 text-xs font-semibold opacity-90">
          {dueCards} {vi.home.cardsDue}
        </p>
      )}
    </Link>
  );
}
