"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewQuoteForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    description: "",
    amount: "",
    address: "",
    trade: "",
  });

  async function create(send: boolean) {
    setBusy(true);
    setError(null);
    const amountCents = Math.round(parseFloat(form.amount.replace(/[$,]/g, "")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid amount");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          description: form.description,
          amountCents,
          address: form.address || undefined,
          trade: form.trade || undefined,
        }),
      });
      const data = (await res.json()) as { quote?: { id: string }; error?: string };
      if (!res.ok || !data.quote) {
        setError(data.error ?? "Failed");
        return;
      }
      if (send) {
        await fetch(`/api/quotes/${data.quote.id}/send`, { method: "POST" });
      }
      router.push(`/app/quotes/${data.quote.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/app/quotes" className="text-sm text-ink-400 hover:text-white">
        ← Quotes
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">New quote</h1>
      <form
        className="glass chrome-border mt-6 space-y-4 rounded-2xl p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void create(true);
        }}
      >
        {(
          [
            ["customerName", "Customer name", "text"],
            ["customerPhone", "Mobile phone", "tel"],
            ["description", "Job description", "text"],
            ["amount", "Amount ($)", "text"],
            ["address", "Address (optional)", "text"],
            ["trade", "Trade (optional)", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key} className="block text-xs font-medium text-ink-400">
            {label}
            <input
              type={type}
              className="input-dark mt-1"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              required={!label.includes("optional")}
            />
          </label>
        ))}
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void create(false)}
            className="btn-ghost disabled:opacity-50"
          >
            Save draft
          </button>
          <button type="submit" disabled={busy} className="btn-chrome disabled:opacity-50">
            {busy ? "…" : "Send & start chase"}
          </button>
        </div>
        <p className="text-[11px] text-ink-500">
          Sending confirms the customer consented to SMS about this estimate.
        </p>
      </form>
    </div>
  );
}
