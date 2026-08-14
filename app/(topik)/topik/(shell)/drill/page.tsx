import { Suspense } from "react";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { IbtDrillClient } from "@/topik/components/drill/IbtDrillClient";

export default async function DrillPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.drill.title} subtitle={vi.drill.pageSubtitle} />
      <Suspense fallback={<p className="topik-loading">{vi.common.loading}</p>}>
        <IbtDrillClient />
      </Suspense>
    </main>
  );
}
