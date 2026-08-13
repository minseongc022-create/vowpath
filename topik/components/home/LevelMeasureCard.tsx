"use client";

import Link from "next/link";
import { useTopikStrings } from "@/topik/components/i18n/TopikLocaleProvider";
import { IconChevronRight } from "@/topik/components/ui/TopikIcons";

type Props = {
  pct?: number;
};

export function LevelMeasureCard({ pct = 49.4 }: Props) {
  const t = useTopikStrings();

  return (
    <div className="topik-card p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🏆
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-learn-ink">
            {t.home.vocabTop.replace("{pct}", String(pct))}
          </p>
          <p className="mt-0.5 text-xs text-learn-ink-muted">TOPIK Master VN</p>
        </div>
      </div>
      <Link href="/topik/practice" className="topik-measure-btn mt-3 flex items-center justify-center gap-1">
        {t.home.measureNow}
        <IconChevronRight />
      </Link>
    </div>
  );
}
