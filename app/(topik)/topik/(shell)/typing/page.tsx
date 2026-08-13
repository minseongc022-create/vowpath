import { TypingPracticeClient } from "@/topik/components/typing/TypingPracticeClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { vi } from "@/topik/lib/i18n/vi";

export default function TypingPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.typing.title} subtitle={vi.typing.subtitle} />
      <TypingPracticeClient />
    </main>
  );
}
