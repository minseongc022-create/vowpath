"use client";

import { useState } from "react";
import { t } from "@/giu/lib/i18n";
import { useGiuLocale } from "./GiuLocaleProvider";

export function WaitlistForm({ district }: { district?: string }) {
  const { locale } = useGiuLocale();
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/giu/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, district }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t(locale, "waitlistError"));
        return;
      }
      if ("Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch {
          /* ignore */
        }
      }
      setDone(true);
    } catch {
      setError(t(locale, "waitlistError"));
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl bg-giu-accent-soft px-4 py-3 text-sm font-medium text-giu-primary">
        {t(locale, "waitlistDone")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <input
        required
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t(locale, "waitlistPhone")}
        className="giu-input"
      />
      <button type="submit" className="giu-btn-primary !py-3 text-[13px]">
        {t(locale, "waitlistCta")}
      </button>
      {error ? <p className="text-sm text-giu-danger">{error}</p> : null}
    </form>
  );
}
