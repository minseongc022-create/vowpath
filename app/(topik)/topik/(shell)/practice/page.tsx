import { Suspense } from "react";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { getStudyMode } from "@/topik/lib/study-modes";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { TopikModeRow } from "@/topik/components/ui/TopikModeRow";
import { TopikQuizClient } from "@/topik/components/quiz/TopikQuizClient";

export default async function PracticePage() {
  const vi = await getUiStrings();
  const mockMode = getStudyMode("mock-exam", vi);

  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.practice.title} subtitle={vi.practice.subtitle} />
      <div className="topik-mode-list mb-5">
        <TopikModeRow mode={mockMode} />
      </div>
      <Suspense fallback={<p className="topik-loading">{vi.common.loading}</p>}>
        <TopikQuizClient />
      </Suspense>
    </main>
  );
}
