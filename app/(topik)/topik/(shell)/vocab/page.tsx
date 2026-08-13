import { VocabDrillClient } from "@/topik/components/vocab/VocabDrillClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getDictionarySize } from "@/topik/lib/korean/dictionary";
import { vi } from "@/topik/lib/i18n/vi";

export default function VocabPage() {
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
