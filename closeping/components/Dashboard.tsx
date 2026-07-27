"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  chaseDueAt,
  chaseStageLabel,
  deriveStatus,
  formatUsd,
  nextChaseIndex,
  type Stats,
} from "@/lib/quotes";
import { CHASE_INTERVALS_DAYS, type Quote } from "@/lib/types";

export function OverviewClient() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void fetch("/api/quotes")
      .then((r) => r.json())
      .then((d: { stats?: Stats }) => setStats(d.stats ?? null));
  }, []);

  if (!stats) return <p className="text-sm text-ink-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Overview</h1>
        <Link href="/app/quotes/new" className="btn-chrome !px-4 !py-2 text-xs">
          + Add quote
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Pipeline" value={formatUsd(stats.pipelineCents)} />
        <Stat label="Active chase" value={String(stats.chasingCount)} />
        <Stat label="Won this month" value={String(stats.wonMonth)} />
        <Stat label="Recovered" value={formatUsd(stats.recoveredCents)} glow />
      </div>
      <div className="glass chrome-border mt-8 rounded-2xl p-6">
        <h2 className="font-display font-semibold text-white">Chase cadence</h2>
        <p className="mt-2 text-sm text-ink-400">
          After send: automatic SMS at <strong className="text-ink-200">48 hours</strong>,{" "}
          <strong className="text-ink-200">7 days</strong>, and{" "}
          <strong className="text-ink-200">14 days</strong>. Stops when you mark won or lost.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, glow }: { label: string; value: string; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        glow ? "border-white/20 bg-white/[0.06] shadow-glow" : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${glow ? "chrome-text" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

export function QuotesClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [tab, setTab] = useState<"open" | "chase">("open");
  const [csv, setCsv] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes");
      const data = (await res.json()) as { quotes?: Quote[] };
      setQuotes(data.quotes ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = quotes.filter((q) => {
    const s = deriveStatus(q);
    return s === "draft" || s === "sent" || s === "chasing";
  });
  const chase = quotes.filter((q) => {
    const s = deriveStatus(q);
    return s === "sent" || s === "chasing";
  });

  async function doImport() {
    const res = await fetch("/api/quotes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    if (res.ok) {
      setCsv("");
      setImportOpen(false);
      await load();
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Quotes</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportOpen((v) => !v)}
            className="btn-ghost !px-4 !py-2 text-xs"
          >
            Import CSV
          </button>
          <Link href="/app/quotes/new" className="btn-chrome !px-4 !py-2 text-xs">
            + New
          </Link>
        </div>
      </div>

      {importOpen ? (
        <div className="glass chrome-border mt-4 rounded-2xl p-4">
          <p className="text-xs text-ink-400">name, phone, description, amount, address?</p>
          <textarea
            className="input-dark mt-2 font-mono text-xs"
            rows={4}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Jane,5551234567,Roof,8500"
          />
          <button type="button" onClick={() => void doImport()} className="btn-chrome mt-2 !py-2 text-xs">
            Import
          </button>
        </div>
      ) : null}

      <div className="mt-5 flex gap-1 rounded-full border border-white/10 bg-black/40 p-1">
        {(["open", "chase"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold capitalize ${
              tab === t ? "bg-white text-ink-950" : "text-ink-400 hover:text-white"
            }`}
          >
            {t} ({t === "open" ? open.length : chase.length})
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : (tab === "open" ? open : chase).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-display font-semibold text-white">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink-500">Add a quote to start chasing.</p>
          </div>
        ) : (
          (tab === "open" ? open : chase).map((q) => (
            <QuoteRow key={q.id} quote={q} showChase={tab === "chase"} />
          ))
        )}
      </div>
    </div>
  );
}

function QuoteRow({ quote, showChase }: { quote: Quote; showChase?: boolean }) {
  const st = deriveStatus(quote);
  const next = nextChaseIndex(quote);
  const due = next != null ? chaseDueAt(quote, next) : null;

  return (
    <Link
      href={`/app/quotes/${quote.id}`}
      className="glass chrome-border flex items-center justify-between rounded-xl p-4 transition hover:bg-white/[0.05]"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{quote.customerName}</p>
        <p className="truncate text-sm text-ink-500">{quote.description}</p>
        <span className="mt-1 inline-block rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-400">
          {st}
        </span>
        {showChase ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {CHASE_INTERVALS_DAYS.map((_, i) => (
              <span
                key={i}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  i < quote.chaseSentAt.length
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-ink-500"
                }`}
              >
                {i < quote.chaseSentAt.length ? "✓ " : ""}
                {chaseStageLabel(i)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ml-4 text-right">
        <p className="font-display font-bold chrome-text">{formatUsd(quote.amountCents)}</p>
        {due ? (
          <p className="mt-1 text-[10px] text-ink-500">Next {due.toLocaleDateString()}</p>
        ) : null}
      </div>
    </Link>
  );
}
