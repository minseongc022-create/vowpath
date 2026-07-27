"use client";

import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";
import {
  formatQuoteAmount,
  isOpenQuote,
  quoteAmountCents,
  quotePipelineStage,
  type QuotePipelineStage,
} from "@/lib/quote-chase";
import type { JobCard } from "@/lib/types";

const STAGE_BADGE: Record<QuotePipelineStage, string> = {
  lead: "bg-sky-100 text-sky-800",
  draft: "bg-amber-100 text-amber-900",
  ready: "bg-brand-100 text-brand-900",
  sent: "bg-emerald-100 text-emerald-900",
  chasing: "bg-violet-100 text-violet-900",
  booked: "bg-stone-100 text-stone-600",
  closed: "bg-stone-100 text-stone-500",
};

function QuoteRow({ job, labels }: { job: JobCard; labels: ReturnType<typeof useVowDashboard>["quotes"] }) {
  const stage = quotePipelineStage(job);
  const amount = quoteAmountCents(job);
  const stageLabel = labels.stages[stage] ?? stage;

  return (
    <Link
      href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(job.id)}`}
      className="flex flex-col gap-2 rounded-xl border border-brand-200/80 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-brand-950">{job.customerName || labels.unnamed}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STAGE_BADGE[stage]}`}>
            {stageLabel}
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-stone-600">{job.symptom || job.arrivalWindow || "—"}</p>
        {job.address ? (
          <p className="mt-0.5 truncate text-xs text-stone-500">{job.address}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        {amount ? (
          <p className="text-lg font-bold text-brand-900">{formatQuoteAmount(amount)}</p>
        ) : (
          <p className="text-sm font-medium text-amber-700">{labels.noAmount}</p>
        )}
        <p className="text-xs text-stone-500">
          {new Date(job.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

export function QuotesPipelineView() {
  const { jobs, loading, hasLoaded } = useDashboardData(null);
  const copy = useVowDashboard().quotes;
  const openQuotes = jobs.filter(isOpenQuote);
  const showLoading = loading && !hasLoaded && jobs.length === 0;

  return (
    <AppPage width="wide">
      <Link
        href={ROUTES.dashboard}
        className="text-sm font-medium text-brand-700 hover:text-brand-900 hover:underline"
      >
        {copy.back}
      </Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-950">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">{copy.subtitle}</p>
        </div>
        <Link
          href={ROUTES.chase}
          className="inline-flex items-center justify-center rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          {copy.chaseLink} →
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.kpiOpen}</p>
          <p className="mt-1 text-3xl font-bold text-brand-950">{openQuotes.length}</p>
        </div>
        <div className="rounded-xl border border-brand-200 bg-white p-4 sm:col-span-2">
          <p className="text-sm text-stone-700">{copy.tip}</p>
        </div>
      </div>

      <div className="mt-8">
        {showLoading ? (
          <p className="text-sm text-stone-500">{copy.loading}</p>
        ) : openQuotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-8 text-center">
            <p className="font-semibold text-brand-900">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm text-stone-600">{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openQuotes.map((job) => (
              <QuoteRow key={job.id} job={job} labels={copy} />
            ))}
          </div>
        )}
      </div>
    </AppPage>
  );
}
