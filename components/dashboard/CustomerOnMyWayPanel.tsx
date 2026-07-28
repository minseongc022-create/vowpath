"use client";

import { useState } from "react";

export function CustomerOnMyWayPanel({
  bookingId,
  customerName,
}: {
  bookingId: string;
  customerName: string;
}) {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendDeparting() {
    setSending(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/bookings/on-my-way", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, departing: true, customerName }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; customerPhone?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send SMS.");
        return;
      }
      setNotice("Customer notified — on the way + live map link sent.");
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-brand-200/60 px-4 py-3 sm:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Customer on the way
      </p>
      <p className="mt-1 text-sm text-stone-600">
        When leaving, text <span className="font-semibold">DEPARTING</span> from your staff phone — we
        text the customer a live map link. Or tap below.
      </p>
      <div className="mt-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void sendDeparting()}
          className="rounded-lg border border-brand-300 bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Departing — notify customer"}
        </button>
      </div>
      {notice ? (
        <p className="mt-2 text-sm text-emerald-700">{notice}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}