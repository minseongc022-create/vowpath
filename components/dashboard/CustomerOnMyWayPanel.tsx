"use client";

import { useState } from "react";
import { SMS_ETA_MINUTE_OPTIONS } from "@/lib/sms-templates";

export function CustomerOnMyWayPanel({
  bookingId,
  customerName,
}: {
  bookingId: string;
  customerName: string;
}) {
  const [sending, setSending] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(etaMinutes: number) {
    setSending(etaMinutes);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/bookings/on-my-way", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, etaMinutes, customerName }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; customerPhone?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send SMS.");
        return;
      }
      setNotice(`Customer notified — ETA ~${etaMinutes} min.`);
    } catch {
      setError("Network error.");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="border-t border-brand-200/60 px-4 py-3 sm:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
        Customer on the way
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Notify the customer when your tech is heading out. From the field, text{" "}
        <span className="font-semibold text-stone-800">30</span> (or{" "}
        {SMS_ETA_MINUTE_OPTIONS.join(", ")}) to your shop number.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SMS_ETA_MINUTE_OPTIONS.map((min) => (
          <button
            key={min}
            type="button"
            disabled={sending !== null}
            onClick={() => void send(min)}
            className="rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-900 transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50"
          >
            {sending === min ? "Sending…" : `${min} min`}
          </button>
        ))}
      </div>
      {notice ? (
        <p className="mt-2 text-sm text-emerald-700">{notice}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
