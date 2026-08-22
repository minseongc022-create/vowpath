"use client";

import Link from "next/link";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { HOME_FAVORITE_MODES, getStudyMode } from "@/topik/lib/study-modes";
import { TopikModeTile } from "@/topik/components/ui/TopikModeRow";

export function StudyModeGrid() {
  const vi = useTopikVi();

  return (
    <section className="topik-mode-grid-section">
      <p className="topik-section-title">{vi.home.quickActions}</p>
      <div className="topik-mode-grid">
        {HOME_FAVORITE_MODES.map((id) => {
          const mode = getStudyMode(id, vi);
          return <TopikModeTile key={id} mode={mode} />;
        })}
      </div>
    </section>
  );
}
