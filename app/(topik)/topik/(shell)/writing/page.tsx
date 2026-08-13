import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { WritingCorrectionForm } from "@/topik/components/writing/WritingCorrectionForm";

export default function WritingPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.writing.title} subtitle={vi.writing.subtitle} />
      <WritingCorrectionForm />
    </main>
  );
}
