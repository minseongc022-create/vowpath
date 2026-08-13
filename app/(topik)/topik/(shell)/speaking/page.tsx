import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { SpeakingPracticeClient } from "@/topik/components/speaking/SpeakingPracticeClient";

export default function SpeakingPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.speaking.title} subtitle={vi.speaking.subtitle} />
      <SpeakingPracticeClient />
    </main>
  );
}
