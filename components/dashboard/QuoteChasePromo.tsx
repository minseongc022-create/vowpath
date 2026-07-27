"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { isInChaseQueue, isOpenQuote } from "@/lib/quote-chase";

export function QuoteChasePromo() {
  const copy = useVowDashboard().quoteChasePromo;
  const { jobs } = useDashboardData(null);
  const openCount = jobs.filter(isOpenQuote).length;
  const chaseCount = jobs.filter(isInChaseQueue).length;

  if (openCount === 0 && chaseCount === 0) return null;

  return (
    <section
      className="mb-6 rounded-2xl border border-brand-300/60 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm"
      aria-label={copy.aria}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-700">{copy.eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-brand-950">{copy.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{copy.body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={ROUTES.quotes}
            className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            {copy.quotesCta}
            {openCount + chaseCount > 0 ? ` (${openCount + chaseCount})` : ""}
          </Link>
        </div>
      </div>
    </section>
  );
}
