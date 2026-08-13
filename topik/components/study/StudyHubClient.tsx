import { vi } from "@/topik/lib/i18n/vi";
import { STUDY_MODES } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikModeRow } from "@/topik/components/ui/TopikModeRow";

/** Malhaeboka "전체 학습" tab — unified list, line icons */
export function StudyHubClient() {
  return (
    <div className="topik-animate-in">
      <TopikPageHeader title={vi.studyHub.title} subtitle={vi.studyHub.subtitle} />
      <div className="topik-mode-list">
        {STUDY_MODES.map((mode) => (
          <TopikModeRow key={mode.id} mode={mode} />
        ))}
      </div>
    </div>
  );
}
