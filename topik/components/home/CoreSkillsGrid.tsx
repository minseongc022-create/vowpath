"use client";

import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { EDUCATION_MODE_SECTIONS, getStudyMode } from "@/topik/lib/study-modes";
import { TopikModeTile } from "@/topik/components/ui/TopikModeRow";

/** All core learning modes grouped by skill area */
export function CoreSkillsGrid() {
  const vi = useTopikVi();

  return (
    <div className="space-y-5 mb-5">
      {EDUCATION_MODE_SECTIONS.map((section) => (
        <section key={section.id} className="topik-mode-grid-section">
          <p className="topik-section-title">{vi.education.sections[section.id]}</p>
          <div className="topik-mode-grid">
            {section.modes.map((id) => {
              const mode = getStudyMode(id, vi);
              return <TopikModeTile key={id} mode={mode} />;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
