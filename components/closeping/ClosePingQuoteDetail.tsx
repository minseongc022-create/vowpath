"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  chaseStageLabel,
  formatQuoteAmount,
  quoteAmountCents,
  quoteChaseSentStages,
  quotePipelineStage,
  quoteSentAt,
  QUOTE_CHASE_INTERVALS_DAYS,
} from "@/lib/quote-chase";
import { stageLabel } from "@/lib/closeping/quotes-core";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";
import type { JobCard } from "@/lib/types";

export function ClosePingQuoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/closeping/quotes/${encodeURIComponent(id)}`);
      const data = (await res.json()) as { quote?: JobCard; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Not found");
        setQuote(null);
        return;
      }
      setQuote(data.quote ?? null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendQuote() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/closeping/quotes/${id}/send`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Send failed");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "won" | "lost") {
    setBusy(true);
    try {
      const res = await fetch(`/api/closeping/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        router.push(CLOSEPING_ROUTES.quotes);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;
  if (!quote) {
    return (
      <div>
        <p className="text-rose-600">{error ?? "Quote not found"}</p>
        <Link href={CLOSEPING_ROUTES.quotes} className="mt-2 inline-block text-sm text-ping-700">
          ← Back
        </Link>
      </div>
    );
  }

  const stage = quotePipelineStage(quote);
  const amount = quoteAmountCents(quote);
  const sent = quoteSentAt(quote);
  const chaseDone = quoteChaseSentStages(quote).length;
  const isClosed = stage === "booked" || stage === "closed";

  return (
    <div>
      <Link href={CLOSEPING_ROUTES.quotes} className="text-sm font-medium text-ping-700 hover:underline">
        ← Back to quotes
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ping-950">{quote.customerName}</h1>
          <p className="mt-1 text-stone-600">{quote.symptom}</p>
          {quote.address ? <p className="text-sm text-stone-500">{quote.address}</p> : null}
          <span className="mt-2 inline-block rounded-full bg-ping-100 px-2.5 py-0.5 text-xs font-bold uppercase text-ping-800">
            {stageLabel(stage)}
          </span>
        </div>
        {amount ? (
          <p className="text-3xl font-bold text-ping-900">{formatQuoteAmount(amount)}</p>
        ) : null}
      </div>

      <div className="mt-6 rounded-xl border border-ping-100 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-ping-950">Contact</h2>
        <p className="mt-2 text-sm text-stone-600">
          Phone: {quote.customerPhone ?? quote.estimateDoc?.customerPhone ?? "—"}
        </p>
        {sent ? (
          <p className="mt-1 text-sm text-stone-600">
            Quote sent: {new Date(sent).toLocaleString()}
          </p>
        ) : null}
      </div>

      {!isClosed && sent ? (
        <div className="mt-4 rounded-xl border border-ping-100 bg-white p-5">
          <h2 className="font-semibold text-ping-950">Chase progress</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUOTE_CHASE_INTERVALS_DAYS.map((_, i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  i < chaseDone ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"
                }`}
              >
                {i < chaseDone ? "✓ " : ""}
                {chaseStageLabel(i)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      {!isClosed ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {!sent ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendQuote()}
              className="rounded-lg bg-ping-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ping-700 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send & start chase"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("won")}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
          >
            Mark won
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("lost")}
            className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            Mark lost
          </button>
        </div>
      ) : null}
    </div>
  );
}
