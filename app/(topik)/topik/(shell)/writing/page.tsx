import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { WritingCorrectionForm } from "@/topik/components/writing/WritingCorrectionForm";

export default async function WritingPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.writing.title} subtitle={vi.writing.subtitle} />
      <WritingCorrectionForm />
    </main>
  );
}
