"use client";

import { useState } from "react";
import type { WrongRecord } from "@/topik/lib/store/file-store";
import { vi } from "@/topik/lib/i18n/vi";

export function WrongNotesClient({ initial }: { initial: WrongRecord[] }) {
  const [items, setItems] = useState(initial);

  async function resolve(id: string) {
    await fetch("/topik/api/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-wrong", id }),
    });
    setItems((prev) => prev.filter((w) => w.id !== id));
  }

  if (items.length === 0) {
    return (
      <div className="topik-card p-8 text-center">
        <p className="text-4xl mb-2">✨</p>
        <p className="text-sm text-learn-ink-muted">{vi.wrongNotes.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((w) => (
        <div key={w.id} className="topik-card p-4">
          <span className="topik-badge">TOPIK {w.level}</span>
          <p className="mt-2 text-sm font-semibold text-learn-ink">{w.questionVi ?? w.question}</p>
          <p className="mt-1 text-xs text-learn-ink-muted">{w.explanationVi}</p>
          <button
            type="button"
            onClick={() => void resolve(w.id)}
            className="mt-3 text-xs font-bold text-learn-primary"
          >
            ✓ {vi.wrongNotes.resolved}
          </button>
        </div>
      ))}
    </div>
  );
}
