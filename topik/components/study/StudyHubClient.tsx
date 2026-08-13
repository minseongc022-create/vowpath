import { vi } from "@/topik/lib/i18n/vi";
import { STUDY_MODES } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikModeRow } from "@/topik/components/ui/TopikModeRow";

/** All TOPIK study modes — speaking, writing, mock exam, practice, lessons, SRS */
export function StudyHubClient() {
  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={vi.studyHub.title} subtitle={vi.studyHub.subtitle} />
      <div className="topik-mode-list topik-study-hub-list">
        {STUDY_MODES.map((mode) => (
          <TopikModeRow key={mode.id} mode={mode} />
        ))}
      </div>
    </div>
  );
}
