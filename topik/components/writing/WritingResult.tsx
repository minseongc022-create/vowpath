"use client";

import type { WritingCorrectionResult } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

export function WritingResult({
  result,
  onRetry,
}: {
  result: WritingCorrectionResult;
  onRetry: () => void;
}) {
  const pct = Math.round((result.estimatedScore / result.maxScore) * 100);

  return (
    <div className="space-y-4 topik-animate-in">
      <div className="topik-card-elevated p-6 text-center">
        <p className="text-[11px] font-bold uppercase text-[var(--topik-ink-muted)]">{vi.writing.score}</p>
        <p className="mt-1 text-4xl font-extrabold text-[var(--topik-primary)]">
          {result.estimatedScore}
          <span className="text-lg font-medium text-[var(--topik-ink-muted)]"> / {result.maxScore}</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-[var(--topik-muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--topik-primary)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: vi.writing.taskFulfillment, value: result.taskFulfillment },
          { label: vi.writing.structure, value: result.structure },
          { label: vi.writing.languageUse, value: result.languageUse },
        ].map((item) => (
          <div key={item.label} className="topik-card p-3 text-center">
            <p className="text-lg font-bold">{item.value}</p>
            <p className="text-[10px] text-[var(--topik-ink-muted)]">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="topik-card p-4">
        <p className="text-sm leading-relaxed">{result.overallFeedbackVi}</p>
      </div>

      {result.improvementsVi.length > 0 && (
        <div className="topik-card p-4">
          <p className="text-xs font-bold text-[var(--topik-primary)] mb-2">{vi.writing.improvements}</p>
          <ul className="space-y-1">
            {result.improvementsVi.map((s, i) => (
              <li key={i} className="text-sm">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {result.sentenceCorrections.length > 0 && (
        <div className="topik-card p-4 space-y-3">
          <p className="text-xs font-bold text-[var(--topik-ink-muted)]">{vi.writing.corrections}</p>
          {result.sentenceCorrections.map((c, i) => (
            <div key={i} className="rounded-xl bg-[var(--topik-muted)] p-3 space-y-1">
              <p className="text-sm text-red-600 line-through">{c.original}</p>
              <p className="text-sm font-semibold text-[var(--topik-accent)]">{c.corrected}</p>
              <p className="text-xs text-[var(--topik-ink-muted)]">{c.explanationVi}</p>
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onRetry} className="topik-btn-primary bg-[var(--topik-surface)] !text-[var(--topik-ink)] border border-[var(--topik-border)] shadow-none">
        {vi.writing.tryAgain}
      </button>
    </div>
  );
}
