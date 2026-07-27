"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppPage } from "@/components/ui/AppPage";
import { ChaseQueueView } from "@/components/dashboard/ChaseQueueView";
import { QuotesPipelineView } from "@/components/dashboard/QuotesPipelineView";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";

type Tab = "open" | "chase";

export function QuotesHubView() {
  const sp = useSearchParams();
  const tab: Tab = sp.get("tab") === "chase" ? "chase" : "open";
  const copy = useVowDashboard().quotesHub;

  return (
    <AppPage width="wide">
      <Link
        href={ROUTES.dashboard}
        className="text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        {copy.back}
      </Link>
      <div className="mt-4">
        <h1 className="text-2xl font-bold text-brand-950">{copy.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">{copy.subtitle}</p>
      </div>

      <div
        className="mt-5 flex gap-1 rounded-xl border border-brand-200 bg-white p-1 shadow-sm"
        role="tablist"
        aria-label={copy.title}
      >
        <Link
          href={ROUTES.quotes}
          role="tab"
          aria-selected={tab === "open"}
          className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${
            tab === "open"
              ? "bg-brand-700 text-white shadow-sm"
              : "text-brand-800 hover:bg-brand-50"
          }`}
        >
          {copy.tabOpen}
        </Link>
        <Link
          href={`${ROUTES.quotes}?tab=chase`}
          role="tab"
          aria-selected={tab === "chase"}
          className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition ${
            tab === "chase"
              ? "bg-brand-700 text-white shadow-sm"
              : "text-brand-800 hover:bg-brand-50"
          }`}
        >
          {copy.tabChase}
        </Link>
      </div>

      <div className="mt-4">
        {tab === "chase" ? <ChaseQueueView embedded /> : <QuotesPipelineView embedded />}
      </div>
    </AppPage>
  );
}
