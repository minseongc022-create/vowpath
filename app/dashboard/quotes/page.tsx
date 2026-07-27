import { Suspense } from "react";
import { QuotesHubView } from "@/components/dashboard/QuotesHubView";

export default function QuotesDashboardPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-stone-500">Loading…</p>}>
      <QuotesHubView />
    </Suspense>
  );
}
