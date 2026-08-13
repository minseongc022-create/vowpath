import { Suspense } from "react";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { MockExamClient } from "@/topik/components/mock-exam/MockExamClient";

export default function MockExamPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.mockExam.title} subtitle={vi.mockExam.subtitle} />
      <Suspense fallback={<p className="topik-loading">{vi.common.loading}</p>}>
        <MockExamClient />
      </Suspense>
    </main>
  );
}
