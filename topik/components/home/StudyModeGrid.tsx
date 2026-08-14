"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { HOME_FAVORITE_MODES, getStudyMode } from "@/topik/lib/study-modes";
import { TopikModeTile } from "@/topik/components/ui/TopikModeRow";

type Props = {
  srsTotal?: number;
  srsMastered?: number;
};

export function StudyModeGrid({ srsTotal, srsMastered }: Props) {
  const vi = useTopikVi();

  return (
    <section className="topik-mode-grid-section">
      <p className="topik-section-title">{vi.home.quickActions}</p>
      <div className="topik-mode-grid">
        {HOME_FAVORITE_MODES.map((id) => {
          const mode = getStudyMode(id, vi);
          const extra =
            id === "review" && srsTotal !== undefined
              ? `${srsTotal} thẻ · ${srsMastered} thuộc`
              : undefined;
          return <TopikModeTile key={id} mode={mode} extra={extra} />;
        })}
      </div>
    </section>
  );
}
