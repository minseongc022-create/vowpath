"use client";

import Link from "next/link";
import { vi } from "@/topik/lib/i18n/vi";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

export function WrongNotesClient() {
  const { wrongAnswers, resolveWrong } = useTopikStore();

  if (wrongAnswers.length === 0) {
    return (
      <div className="topik-card-elevated p-8 text-center">
        <p className="text-4xl mb-2">✨</p>
        <p className="text-sm text-[var(--topik-ink-muted)]">{vi.wrongNotes.empty}</p>
        <Link href="/topik/practice" prefetch className="mt-4 inline-block text-sm font-bold text-[var(--topik-primary)]">
          → {vi.nav.practice}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wrongAnswers.map((w) => (
        <div key={w.id} className="topik-card p-4">
          <span className="topik-badge">TOPIK {w.level}</span>
          <p className="mt-2 text-sm font-semibold">{w.questionVi ?? w.question}</p>
          <p className="mt-1 text-xs text-[var(--topik-ink-muted)]">{w.explanationVi}</p>
          <button type="button" onClick={() => resolveWrong(w.id)} className="mt-3 text-xs font-bold text-[var(--topik-primary)]">
            ✓ {vi.wrongNotes.resolved}
          </button>
        </div>
      ))}
    </div>
  );
}
