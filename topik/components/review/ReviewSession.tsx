"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SrsCard } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle, IconChevronRight, IconInbox } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";

type Quality = 0 | 1 | 3 | 5;

export function ReviewSession() {
  const [cards, setCards] = useState<SrsCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [stats, setStats] = useState({ due: 0, total: 0, mastered: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const [dueRes, statsRes] = await Promise.all([
      fetch("/topik/api/srs?due=1"),
      fetch("/topik/api/srs"),
    ]);
    const due = (await dueRes.json()) as SrsCard[];
    const statsData = (await statsRes.json()) as { due: number; total: number; mastered: number; cards: SrsCard[] };
    setCards(due.length > 0 ? due : statsData.cards.slice(0, 10));
    setStats(statsData);
    setIdx(0);
    setFlipped(false);
    setDone(false);
    setReviewed(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function rate(quality: Quality) {
    const card = cards[idx];
    if (!card) return;
    await fetch("/topik/api/srs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", cardId: card.id, quality }),
    });
    setReviewed((r) => r + 1);
    if (idx + 1 >= cards.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  if (loading) {
    return <p className="text-center text-sm text-learn-ink-muted py-12">{vi.common.loading}</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="topik-empty-state topik-card p-8 text-center">
        <IconInbox className="mx-auto text-learn-ink-subtle" />
        <p className="mt-3 text-sm text-learn-ink-muted">{vi.review.empty}</p>
        <Link href="/topik/lessons" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-learn-primary">
          {vi.nav.lessons}
          <IconChevronRight />
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="topik-card p-6 text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-accent" />
        <p className="mt-3 text-lg font-bold text-learn-ink">{vi.review.sessionComplete}</p>
        <p className="text-sm text-learn-ink-muted mt-1">
          {reviewed} {vi.review.cardsReviewed}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 w-full topik-btn topik-btn-primary topik-btn-md"
        >
          {vi.common.retry}
        </button>
      </div>
    );
  }

  const card = cards[idx]!;

  return (
    <div className="space-y-4 topik-animate-in">
      <StudyModeHint />
      <div className="flex justify-between text-xs font-bold text-learn-ink-muted">
        <span>{vi.review.dueToday}: {stats.due}</span>
        <span>{idx + 1} / {cards.length}</span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className={`topik-card w-full min-h-[200px] p-6 flex flex-col items-center justify-center text-center transition-all ${flipped ? "topik-flip" : ""}`}
      >
        {!flipped ? (
          <>
            <span className="text-xs font-bold text-learn-ink-muted mb-2 uppercase">{card.kind}</span>
            <p className="text-2xl font-bold text-learn-ink">
              <KoreanStudyText text={card.front} studyMode />
            </p>
            <p className="mt-4 text-xs text-learn-primary">{vi.review.showAnswer}</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-learn-accent">{card.back}</p>
            <p className="mt-2 text-sm text-learn-ink-muted">{card.backVi}</p>
          </>
        )}
      </button>

      {flipped && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => rate(0)}
            className="rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600"
          >
            {vi.review.again}
          </button>
          <button
            type="button"
            onClick={() => rate(1)}
            className="rounded-xl border border-orange-200 bg-orange-50 py-3 text-sm font-bold text-orange-600"
          >
            {vi.review.hard}
          </button>
          <button
            type="button"
            onClick={() => rate(3)}
            className="rounded-xl border border-green-200 bg-green-50 py-3 text-sm font-bold text-green-600"
          >
            {vi.review.good}
          </button>
          <button
            type="button"
            onClick={() => rate(5)}
            className="rounded-xl border border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-600"
          >
            {vi.review.easy}
          </button>
        </div>
      )}
    </div>
  );
}
