import { TypingPracticeClient } from "@/topik/components/typing/TypingPracticeClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";

export default async function TypingPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.typing.title} subtitle={vi.typing.subtitle} />
      <TypingPracticeClient />
    </main>
  );
}
