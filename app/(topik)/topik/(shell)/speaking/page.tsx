import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { SpeakingPracticeClient } from "@/topik/components/speaking/SpeakingPracticeClient";

export default async function SpeakingPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.speaking.title} subtitle={vi.speaking.subtitle} />
      <SpeakingPracticeClient />
    </main>
  );
}
