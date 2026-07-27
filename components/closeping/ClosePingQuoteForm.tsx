"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CLOSEPING_ROUTES } from "@/lib/closeping/constants";

export function ClosePingQuoteForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [trade, setTrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createQuote(sendAfter: boolean) {
    setBusy(true);
    setError(null);
    const amountCents = Math.round(parseFloat(amount.replace(/[$,]/g, "")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid quote amount.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/closeping/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          jobDescription,
          amountCents,
          address: address || undefined,
          trade: trade || undefined,
        }),
      });
      const data = (await res.json()) as { quote?: { id: string }; error?: string };
      if (!res.ok || !data.quote) {
        setError(data.error ?? "Could not save quote.");
        return;
      }

      if (sendAfter) {
        const sendRes = await fetch(`/api/closeping/quotes/${data.quote.id}/send`, {
          method: "POST",
        });
        const sendData = (await sendRes.json()) as { error?: string };
        if (!sendRes.ok) {
          setError(sendData.error ?? "Saved but could not send SMS.");
          router.push(`${CLOSEPING_ROUTES.quotes}/${data.quote.id}`);
          return;
        }
      }

      router.push(`${CLOSEPING_ROUTES.quotes}/${data.quote.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href={CLOSEPING_ROUTES.quotes} className="text-sm font-medium text-ping-700 hover:underline">
        ← Back to quotes
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-ping-950">New quote</h1>

      <form
        className="mt-6 space-y-4 rounded-xl border border-ping-100 bg-white p-6 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void createQuote(true);
        }}
      >
        <Field label="Customer name" required>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className="input-ping"
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Mobile phone" required>
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            type="tel"
            className="input-ping"
            placeholder="(555) 123-4567"
          />
        </Field>
        <Field label="Job description" required>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
            rows={3}
            className="input-ping"
            placeholder="Full roof replacement — architectural shingles"
          />
        </Field>
        <Field label="Quote amount ($)" required>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="input-ping"
            placeholder="8500"
          />
        </Field>
        <Field label="Address (optional)">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="input-ping"
            placeholder="123 Main St, Tampa FL"
          />
        </Field>
        <Field label="Trade (optional)">
          <input
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="input-ping"
            placeholder="Roofing"
          />
        </Field>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void createQuote(false)}
            className="rounded-lg border border-ping-200 px-4 py-2.5 text-sm font-semibold text-ping-800 hover:bg-ping-50 disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-ping-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ping-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send & start chase"}
          </button>
        </div>
        <p className="text-xs text-stone-500">
          By sending, you confirm the customer consented to SMS about this estimate. Chase runs at
          48h, 7d, 14d with opt-out on every message.
        </p>
      </form>

      <style jsx global>{`
        .input-ping {
          width: 100%;
          margin-top: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
        }
        .input-ping:focus {
          outline: 2px solid #059669;
          outline-offset: 0;
          border-color: #059669;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-stone-700">
      {label}
      {required ? <span className="text-rose-500"> *</span> : null}
      {children}
    </label>
  );
}
