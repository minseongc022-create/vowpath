import { PlacementTestClient } from "@/topik/components/placement/PlacementTestClient";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { vi } from "@/topik/lib/i18n/vi";

export default function PlacementPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.placement.title} subtitle={vi.placement.subtitle} />
      <PlacementTestClient />
    </main>
  );
}
