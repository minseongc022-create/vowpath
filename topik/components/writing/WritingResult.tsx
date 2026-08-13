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
    <div className="space-y-4 learn-animate-in">
      <div className="topik-card p-6 text-center">
        <p className="text-xs font-bold text-learn-ink-muted uppercase">{vi.writing.score}</p>
        <p className="mt-1 text-4xl font-black text-learn-primary">
          {result.estimatedScore}
          <span className="text-lg text-learn-ink-muted font-medium"> / {result.maxScore}</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-learn-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-learn-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {result.source === "demo" && (
          <p className="mt-2 text-[11px] text-learn-ink-subtle">
            Demo mode — set OPENAI_API_KEY for full AI grading
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: vi.writing.taskFulfillment, value: result.taskFulfillment },
          { label: vi.writing.structure, value: result.structure },
          { label: vi.writing.languageUse, value: result.languageUse },
        ].map((item) => (
          <div key={item.label} className="topik-card p-3 text-center">
            <p className="text-lg font-bold text-learn-ink">{item.value}</p>
            <p className="text-[10px] text-learn-ink-muted leading-tight">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="topik-card p-4">
        <p className="text-sm text-learn-ink leading-relaxed">{result.overallFeedbackVi}</p>
      </div>

      {result.strengthsVi.length > 0 && (
        <div className="topik-card p-4">
          <p className="text-xs font-bold text-learn-accent mb-2">✓ {vi.writing.strengths}</p>
          <ul className="space-y-1">
            {result.strengthsVi.map((s, i) => (
              <li key={i} className="text-sm text-learn-ink">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {result.improvementsVi.length > 0 && (
        <div className="topik-card p-4">
          <p className="text-xs font-bold text-learn-primary mb-2">→ {vi.writing.improvements}</p>
          <ul className="space-y-1">
            {result.improvementsVi.map((s, i) => (
              <li key={i} className="text-sm text-learn-ink">• {s}</li>
            ))}
          </ul>
        </div>
      )}

      {result.sentenceCorrections.length > 0 && (
        <div className="topik-card p-4 space-y-3">
          <p className="text-xs font-bold text-learn-ink-muted">{vi.writing.corrections}</p>
          {result.sentenceCorrections.map((c, i) => (
            <div key={i} className="rounded-xl bg-learn-muted/50 p-3 space-y-1">
              <p className="text-sm text-red-600 line-through">{c.original}</p>
              <p className="text-sm font-semibold text-learn-accent">{c.corrected}</p>
              <p className="text-xs text-learn-ink-muted">{c.explanationVi}</p>
            </div>
          ))}
        </div>
      )}

      {result.modelAnswer && (
        <div className="topik-card p-4">
          <p className="text-xs font-bold text-learn-ink-muted mb-2">{vi.writing.modelAnswer}</p>
          <p className="text-sm text-learn-ink whitespace-pre-wrap">{result.modelAnswer}</p>
          {result.modelAnswerVi && (
            <p className="mt-2 text-xs text-learn-ink-muted">{result.modelAnswerVi}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-2xl border border-learn-border bg-learn-surface py-3 text-sm font-bold text-learn-ink active:scale-[0.98] transition-transform"
      >
        {vi.writing.tryAgain}
      </button>
    </div>
  );
}
