import { VocabDrillClient } from "@/topik/components/vocab/VocabDrillClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getDictionarySize } from "@/topik/lib/korean/dictionary";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";

export default async function VocabPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader
        title={vi.vocab.title}
        subtitle={`${getDictionarySize()}+ ${vi.vocab.subtitle}`}
      />
      <VocabDrillClient />
    </main>
  );
}
