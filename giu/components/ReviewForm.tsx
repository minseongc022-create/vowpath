"use client";

import { useState } from "react";
import { hapticConfirm, hapticSelect } from "@/giu/lib/haptics";
import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  reservationId: string;
  existingRating?: number;
  onDone?: () => void;
};

export function ReviewForm({ locale, reservationId, existingRating, onDone }: Props) {
  const [rating, setRating] = useState(existingRating ?? 0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(Boolean(existingRating));
  const [error, setError] = useState("");

  if (done) {
    return (
      <div className="giu-info-banner text-center">
        {t(locale, "reviewThanks")} {existingRating || rating ? "★".repeat(existingRating || rating) : null}
      </div>
    );
  }

  async function submit() {
    if (rating < 1) {
      setError(t(locale, "reviewPickStars"));
      return;
    }
    hapticSelect();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/giu/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reservationId, rating, comment: comment.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t(locale, "waitlistError"));
        return;
      }
      hapticConfirm();
      setDone(true);
      onDone?.();
    } catch {
      setError(t(locale, "waitlistError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="giu-card space-y-3">
      <div>
        <p className="text-[15px] font-bold text-giu-ink">{t(locale, "reviewTitle")}</p>
        <p className="mt-0.5 text-[12px] text-giu-muted">{t(locale, "reviewSub")}</p>
      </div>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`giu-btn-3d giu-tap text-3xl transition ${n <= rating ? "text-giu-gold" : "text-giu-border"}`}
            aria-label={`${n}점`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t(locale, "reviewPlaceholder")}
        rows={2}
        className="giu-textarea"
        maxLength={500}
      />
      {error ? <p className="text-[12px] text-giu-danger">{error}</p> : null}
      <button type="button" disabled={busy} onClick={() => void submit()} className="giu-btn-primary giu-btn-3d">
        {busy ? t(locale, "loading") : t(locale, "reviewSubmit")}
      </button>
    </div>
  );
}
