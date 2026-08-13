"use client";

import { useState } from "react";
import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

export function ReviewSession() {
  const { ready, dueCards, srsStats, reviewCard } = useTopikStore();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const cards = dueCards.length > 0 ? dueCards : [];

  if (!ready) {
    return <div className="topik-skeleton h-48" />;
  }

  if (cards.length === 0) {
    return (
      <div className="topik-card-elevated p-8 text-center">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm text-[var(--topik-ink-muted)]">{vi.review.empty}</p>
        <Link href="/topik/lessons" prefetch className="mt-4 inline-block text-sm font-bold text-[var(--topik-primary)]">
          → {vi.nav.lessons}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="topik-card-elevated p-6 text-center topik-animate-in">
        <p className="text-4xl mb-2">✅</p>
        <p className="text-lg font-bold">{vi.review.sessionComplete}</p>
        <p className="text-sm text-[var(--topik-ink-muted)] mt-1">{reviewed} {vi.review.cardsReviewed}</p>
        <button type="button" onClick={() => { setDone(false); setIdx(0); setReviewed(0); setFlipped(false); }} className="topik-btn-primary mt-4">
          {vi.common.retry}
        </button>
      </div>
    );
  }

  const card = cards[idx]!;

  function rate(quality: number) {
    reviewCard(card.id, quality);
    setReviewed((r) => r + 1);
    if (idx + 1 >= cards.length) setDone(true);
    else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  return (
    <div className="space-y-4 topik-animate-in">
      <div className="flex justify-between text-xs font-bold text-[var(--topik-ink-muted)]">
        <span>{vi.review.dueToday}: {srsStats.due}</span>
        <span>{idx + 1} / {cards.length}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="topik-card-elevated w-full min-h-[220px] p-6 flex flex-col items-center justify-center text-center topik-flip"
      >
        {!flipped ? (
          <>
            <span className="topik-badge mb-3">{card.kind}</span>
            <p className="text-2xl font-extrabold">{card.front}</p>
            <p className="mt-4 text-xs font-semibold text-[var(--topik-primary)]">{vi.review.showAnswer}</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-[var(--topik-accent)]">{card.back}</p>
            <p className="mt-2 text-sm text-[var(--topik-ink-muted)]">{card.backVi}</p>
          </>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { q: 0, label: vi.review.again, cls: "bg-red-50 text-red-600 border-red-200" },
            { q: 1, label: vi.review.hard, cls: "bg-orange-50 text-orange-600 border-orange-200" },
            { q: 3, label: vi.review.good, cls: "bg-green-50 text-green-700 border-green-200" },
            { q: 5, label: vi.review.easy, cls: "bg-blue-50 text-blue-700 border-blue-200" },
          ].map((btn) => (
            <button
              key={btn.q}
              type="button"
              onClick={() => rate(btn.q)}
              className={`rounded-[var(--topik-radius)] border py-3 text-sm font-bold ${btn.cls}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
