import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { MockExamClient } from "@/topik/components/mock-exam/MockExamClient";

export default function MockExamPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.mockExam.title} subtitle={vi.mockExam.subtitle} />
      <MockExamClient />
    </main>
  );
}
