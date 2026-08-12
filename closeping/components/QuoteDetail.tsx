"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { chaseStageLabel, deriveStatus, formatUsd } from "@/lib/quotes";
import { CHASE_INTERVALS_DAYS, type Quote } from "@/lib/types";

export function QuoteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [smsPreview, setSmsPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/quotes/${id}`);
    const data = (await res.json()) as { quote?: Quote; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Not found");
      return;
    }
    setQuote(data.quote ?? null);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${id}/send`, { method: "POST" });
      const data = (await res.json()) as { error?: string; smsPreview?: string; quote?: Quote };
      if (!res.ok) {
        setError(data.error ?? "Send failed");
        return;
      }
      setSmsPreview(data.smsPreview ?? null);
      setQuote(data.quote ?? null);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: "won" | "lost") {
    setBusy(true);
    await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.push("/app/quotes");
  }

  if (!quote && !error) return <p className="text-sm text-ink-500">Loading…</p>;
  if (!quote) {
    return (
      <div>
        <p className="text-red-400">{error}</p>
        <Link href="/app/quotes" className="mt-2 text-sm text-ink-400">
          ← Back
        </Link>
      </div>
    );
  }

  const st = deriveStatus(quote);
  const closed = st === "won" || st === "lost";

  return (
    <div>
      <Link href="/app/quotes" className="text-sm text-ink-400 hover:text-white">
        ← Quotes
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">{quote.customerName}</h1>
          <p className="mt-1 text-ink-400">{quote.description}</p>
          <span className="mt-2 inline-block rounded-full border border-white/15 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-300">
            {st}
          </span>
        </div>
        <p className="font-display text-3xl font-bold chrome-text">{formatUsd(quote.amountCents)}</p>
      </div>

      <div className="glass chrome-border mt-6 rounded-2xl p-5 text-sm text-ink-300">
        <p>Phone: {quote.customerPhone}</p>
        {quote.sentAt ? <p className="mt-1">Sent: {new Date(quote.sentAt).toLocaleString()}</p> : null}
      </div>

      {quote.sentAt && !closed ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {CHASE_INTERVALS_DAYS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                i < quote.chaseSentAt.length
                  ? "bg-white/20 text-white"
                  : "border border-white/10 text-ink-500"
              }`}
            >
              {i < quote.chaseSentAt.length ? "✓ " : ""}
              {chaseStageLabel(i)}
            </span>
          ))}
        </div>
      ) : null}

      {smsPreview ? (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-ink-400">
          SMS: {smsPreview}
        </p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      {!closed ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {!quote.sentAt ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void send()}
              className="btn-chrome disabled:opacity-50"
            >
              Send & start chase
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("won")}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
          >
            Mark won
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus("lost")}
            className="btn-ghost"
          >
            Mark lost
          </button>
        </div>
      ) : null}
    </div>
  );
}
