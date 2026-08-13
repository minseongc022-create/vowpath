import { vi } from "@/topik/lib/i18n/vi";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { ReviewSession } from "@/topik/components/review/ReviewSession";

export default function ReviewPage() {
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.review.title} subtitle={vi.review.subtitle} />
      <ReviewSession />
    </main>
  );
}
