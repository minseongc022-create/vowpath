import { PlacementTestClient } from "@/topik/components/placement/PlacementTestClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { getUiStrings } from "@/topik/lib/i18n/server-strings";

export default async function PlacementPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.placement.title} subtitle={vi.placement.subtitle} />
      <PlacementTestClient />
    </main>
  );
}
