import { getUiStrings } from "@/topik/lib/i18n/server-strings";
import { TopikPageHeader } from "@/topik/components/ui/TopikPageHeader";
import { ReviewSession } from "@/topik/components/review/ReviewSession";

export default async function ReviewPage() {
  const vi = await getUiStrings();
  return (
    <main className="topik-page">
      <TopikPageHeader title={vi.review.title} subtitle={vi.review.subtitle} />
      <ReviewSession />
    </main>
  );
}
