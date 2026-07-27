"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  chaseDueAt,
  chaseStageLabel,
  formatQuoteAmount,
  isInChaseQueue,
  isOpenQuote,
  nextChaseStageIndex,
  quoteAmountCents,
  quoteChaseSentStages,
  quotePipelineStage,
  quoteSentAt,
  QUOTE_CHASE_INTERVALS_DAYS,
} from "@/lib/quote-chase";
import { stageLabel, type ClosePingStats } from "@/lib/closeping/quotes-core";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";
import type { JobCard } from "@/lib/types";

type QuoteRow = JobCard;

function QuoteListItem({ quote }: { quote: QuoteRow }) {
  const stage = quotePipelineStage(quote);
  const amount = quoteAmountCents(quote);

  return (
    <Link
      href={`${CLOSEPING_ROUTES.quotes}/${encodeURIComponent(quote.id)}`}
      className="flex items-center justify-between rounded-xl border border-ping-100 bg-white p-4 shadow-sm transition hover:border-ping-300 hover:shadow-md"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-ping-950">{quote.customerName}</p>
        <p className="truncate text-sm text-stone-600">{quote.symptom}</p>
        <span className="mt-1 inline-block rounded-full bg-ping-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ping-800">
          {stageLabel(stage)}
        </span>
      </div>
      {amount ? (
        <p className="ml-4 shrink-0 text-lg font-bold text-ping-900">{formatQuoteAmount(amount)}</p>
      ) : null}
    </Link>
  );
}

function ChaseRow({ quote }: { quote: QuoteRow }) {
  const amount = quoteAmountCents(quote);
  const sent = quoteSentAt(quote);
  const stagesDone = quoteChaseSentStages(quote).length;
  const nextIdx = nextChaseStageIndex(quote);
  const nextDue = nextIdx != null ? chaseDueAt(quote, nextIdx) : null;
  const isDue = nextDue && nextDue.getTime() <= Date.now();

  return (
    <Link
      href={`${CLOSEPING_ROUTES.quotes}/${encodeURIComponent(quote.id)}`}
      className="block rounded-xl border border-ping-100 bg-white p-4 shadow-sm transition hover:border-ping-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ping-950">{quote.customerName}</p>
          {sent ? (
            <p className="text-xs text-stone-500">Sent {new Date(sent).toLocaleDateString()}</p>
          ) : null}
        </div>
        {amount ? <p className="font-bold text-ping-900">{formatQuoteAmount(amount)}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
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
      {nextDue ? (
        <p className={`mt-2 text-xs font-medium ${isDue ? "text-rose-700" : "text-stone-500"}`}>
          {isDue ? "Due now" : `Next: ${nextDue.toLocaleDateString()}`}
        </p>
      ) : null}
    </Link>
  );
}

export function ClosePingQuotesView({ initialTab = "open" }: { initialTab?: "open" | "chase" }) {
  const [tab, setTab] = useState(initialTab);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/closeping/quotes");
      const data = (await res.json()) as { quotes?: QuoteRow[] };
      setQuotes(data.quotes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openQuotes = quotes.filter(isOpenQuote);
  const chaseQueue = quotes.filter(isInChaseQueue);

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/closeping/quotes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (res.ok) {
        setCsv("");
        setImportOpen(false);
        await load();
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ping-950">Quotes</h1>
          <p className="text-sm text-stone-600">Open estimates and active chase queue</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="rounded-lg border border-ping-200 bg-white px-4 py-2 text-sm font-semibold text-ping-800 hover:bg-ping-50"
          >
            Import CSV
          </button>
          <Link
            href={CLOSEPING_ROUTES.newQuote}
            className="rounded-lg bg-ping-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ping-700"
          >
            + New quote
          </Link>
        </div>
      </div>

      {importOpen ? (
        <div className="mt-4 rounded-xl border border-ping-200 bg-white p-4">
          <p className="text-sm font-medium text-stone-700">
            CSV format: name, phone, description, amount, address (optional)
          </p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={5}
            placeholder="Jane Smith,5551234567,Roof repair,8500,123 Main St"
            className="mt-2 w-full rounded-lg border border-stone-200 p-3 text-sm font-mono"
          />
          <button
            type="button"
            disabled={importing || !csv.trim()}
            onClick={() => void handleImport()}
            className="mt-2 rounded-lg bg-ping-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex gap-1 rounded-xl border border-ping-100 bg-white p-1">
        <button
          type="button"
          onClick={() => setTab("open")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
            tab === "open" ? "bg-ping-600 text-white" : "text-ping-800 hover:bg-ping-50"
          }`}
        >
          Open ({openQuotes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("chase")}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
            tab === "chase" ? "bg-ping-600 text-white" : "text-ping-800 hover:bg-ping-50"
          }`}
        >
          Chase ({chaseQueue.length})
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : tab === "open" ? (
          openQuotes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ping-200 p-8 text-center">
              <p className="font-semibold text-ping-900">No open quotes</p>
              <p className="mt-1 text-sm text-stone-600">Add your first estimate to start chasing.</p>
            </div>
          ) : (
            openQuotes.map((q) => <QuoteListItem key={q.id} quote={q} />)
          )
        ) : chaseQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ping-200 p-8 text-center">
            <p className="font-semibold text-ping-900">Chase queue empty</p>
            <p className="mt-1 text-sm text-stone-600">Send a quote to start automatic follow-up.</p>
          </div>
        ) : (
          chaseQueue.map((q) => <ChaseRow key={q.id} quote={q} />)
        )}
      </div>
    </div>
  );
}

export function ClosePingOverview({ stats }: { stats: ClosePingStats }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ping-950">Overview</h1>
        <Link
          href={CLOSEPING_ROUTES.newQuote}
          className="rounded-lg bg-ping-600 px-4 py-2 text-sm font-semibold text-white hover:bg-ping-700"
        >
          + Add quote
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open pipeline" value={formatQuoteAmount(stats.pipelineCents)} />
        <StatCard label="Active chase" value={String(stats.chasingCount)} />
        <StatCard label="Won this month" value={String(stats.wonThisMonth)} />
        <StatCard label="Recovered value" value={formatQuoteAmount(stats.recoveredCents)} highlight />
      </div>

      <div className="mt-8 rounded-xl border border-ping-100 bg-white p-5">
        <h2 className="font-semibold text-ping-950">Chase schedule</h2>
        <p className="mt-2 text-sm text-stone-600">
          After you send a quote, ClosePing automatically texts at{" "}
          <strong>48 hours</strong>, <strong>7 days</strong>, and <strong>14 days</strong> — polite,
          branded, with opt-out. Chase stops when you mark won or lost.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-ping-200 bg-ping-50" : "border-ping-100 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${highlight ? "text-ping-800" : "text-ping-950"}`}>
        {value}
      </p>
    </div>
  );
}
