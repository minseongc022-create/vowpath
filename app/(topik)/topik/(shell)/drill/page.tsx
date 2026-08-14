import { Suspense } from "react";
import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { IbtDrillClient } from "@/topik/components/drill/IbtDrillClient";

export default function DrillPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.drill.title} subtitle={vi.drill.pageSubtitle} />
      <Suspense fallback={<p className="topik-loading">{vi.common.loading}</p>}>
        <IbtDrillClient />
      </Suspense>
    </main>
  );
}
