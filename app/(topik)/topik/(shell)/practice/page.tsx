import { vi } from "@/topik/lib/i18n/vi";
import { getStudyMode } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikModeRow } from "@/topik/components/ui/TopikModeRow";
import { TopikQuizClient } from "@/topik/components/quiz/TopikQuizClient";

export default function PracticePage() {
  const mockMode = getStudyMode("mock-exam");

  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.practice.title} subtitle={vi.practice.subtitle} />
      <div className="topik-mode-list mb-5">
        <TopikModeRow mode={mockMode} />
      </div>
      <TopikQuizClient />
    </main>
  );
}
