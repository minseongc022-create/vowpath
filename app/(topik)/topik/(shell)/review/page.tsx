import { vi } from "@/topik/lib/i18n/vi";
import { ReviewSession } from "@/topik/components/review/ReviewSession";

export default function ReviewPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 learn-animate-in">
      <h1 className="text-xl font-black text-learn-ink">{vi.review.title}</h1>
      <p className="mt-1 mb-6 text-sm text-learn-ink-muted">{vi.review.subtitle}</p>
      <ReviewSession />
    </main>
  );
}
