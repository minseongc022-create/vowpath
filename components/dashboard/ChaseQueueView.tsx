"use client";

import Link from "next/link";
import { AppPage } from "@/components/ui/AppPage";
import { useDashboardData } from "@/lib/hooks/use-dashboard-data";
import { useVowDashboard } from "@/components/providers/LocaleProvider";
import { ROUTES } from "@/lib/constants";
import {
  chaseDueAt,
  chaseStageLabel,
  formatQuoteAmount,
  isInChaseQueue,
  nextChaseStageIndex,
  quoteAmountCents,
  quoteChaseSentStages,
  quoteSentAt,
  QUOTE_CHASE_INTERVALS_DAYS,
} from "@/lib/quote-chase";
import type { JobCard } from "@/lib/types";

function ChaseRow({ job, labels }: { job: JobCard; labels: ReturnType<typeof useVowDashboard>["chase"] }) {
  const amount = quoteAmountCents(job);
  const sent = quoteSentAt(job);
  const stagesDone = quoteChaseSentStages(job).length;
  const nextIdx = nextChaseStageIndex(job);
  const nextDue = nextIdx != null ? chaseDueAt(job, nextIdx) : null;
  const isDue = nextDue && nextDue.getTime() <= Date.now();

  return (
    <Link
      href={`${ROUTES.dashboard}/bookings/${encodeURIComponent(job.id)}`}
      className="flex flex-col gap-3 rounded-xl border border-brand-200/80 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-brand-950">{job.customerName || labels.unnamed}</p>
        <p className="mt-1 truncate text-sm text-stone-600">{job.symptom || "—"}</p>
        {sent ? (
          <p className="mt-1 text-xs text-stone-500">
            {labels.sent} {new Date(sent).toLocaleDateString()}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUOTE_CHASE_INTERVALS_DAYS.map((days, i) => {
            const done = i < stagesDone;
            const active = i === nextIdx;
            return (
              <span
                key={days}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  done
                    ? "bg-emerald-100 text-emerald-800"
                    : active && isDue
                      ? "bg-rose-100 text-rose-800"
                      : active
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-100 text-stone-500"
                }`}
              >
                {done ? "✓ " : ""}
                {chaseStageLabel(i)}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        {amount ? (
          <p className="text-lg font-bold text-brand-900">{formatQuoteAmount(amount)}</p>
        ) : null}
        {nextDue ? (
          <p className={`text-xs font-medium ${isDue ? "text-rose-700" : "text-stone-500"}`}>
            {isDue ? labels.dueNow : `${labels.next} ${nextDue.toLocaleDateString()}`}
          </p>
        ) : (
          <p className="text-xs text-emerald-700">{labels.complete}</p>
        )}
      </div>
    </Link>
  );
}

export function ChaseQueueView() {
  const { jobs, loading, hasLoaded } = useDashboardData(null);
  const copy = useVowDashboard().chase;
  const queue = jobs.filter(isInChaseQueue);
  const dueNow = queue.filter((j) => {
    const idx = nextChaseStageIndex(j);
    if (idx == null) return false;
    const due = chaseDueAt(j, idx);
    return Boolean(due && due.getTime() <= Date.now());
  });
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
          href={ROUTES.quotes}
          className="inline-flex items-center justify-center rounded-lg border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          ← {copy.quotesLink}
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{copy.kpiActive}</p>
          <p className="mt-1 text-3xl font-bold text-brand-950">{queue.length}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{copy.kpiDue}</p>
          <p className="mt-1 text-3xl font-bold text-rose-900">{dueNow.length}</p>
        </div>
        <div className="rounded-xl border border-brand-200 bg-white p-4">
          <p className="text-sm text-stone-700">{copy.schedule}</p>
        </div>
      </div>

      <div className="mt-8">
        {showLoading ? (
          <p className="text-sm text-stone-500">{copy.loading}</p>
        ) : queue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-8 text-center">
            <p className="font-semibold text-brand-900">{copy.emptyTitle}</p>
            <p className="mt-2 text-sm text-stone-600">{copy.emptyBody}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((job) => (
              <ChaseRow key={job.id} job={job} labels={copy} />
            ))}
          </div>
        )}
      </div>
    </AppPage>
  );
}
