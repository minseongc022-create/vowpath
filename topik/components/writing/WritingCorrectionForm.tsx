"use client";

import { useState } from "react";
import type { WritingTaskType, WritingCorrectionResult } from "@/topik/types";
import { WRITING_PROMPTS } from "@/topik/lib/writing/prompts";
import { vi } from "@/topik/lib/i18n/vi";
import { WritingResult } from "@/topik/components/writing/WritingResult";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

const TASK_TYPES: WritingTaskType[] = ["51", "52", "53", "54"];

export function WritingCorrectionForm() {
  const { incrementWriting } = useTopikStore();
  const [taskType, setTaskType] = useState<WritingTaskType>("53");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WritingCorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt = WRITING_PROMPTS[taskType];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/topik/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType,
          prompt: prompt.prompt,
          answer: answer.trim(),
          wordLimit: prompt.wordLimit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "FAILED");
      setResult(data);
      incrementWriting();
    } catch {
      setError(vi.common.error);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <WritingResult
        result={result}
        onRetry={() => {
          setResult(null);
          setAnswer("");
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 topik-animate-in">
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--topik-ink-muted)]">
          {vi.writing.taskType}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TASK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTaskType(t)}
              className={`rounded-[var(--topik-radius)] border px-3 py-2.5 text-left text-xs font-semibold transition-all active:scale-[0.98] ${
                taskType === t
                  ? "border-[var(--topik-primary)] bg-[var(--topik-primary-soft)] text-[var(--topik-primary)]"
                  : "border-[var(--topik-border)] bg-[var(--topik-surface)]"
              }`}
            >
              {vi.writing.tasks[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="topik-card p-4">
        <p className="text-[11px] font-bold text-[var(--topik-ink-muted)] mb-1">{vi.writing.prompt}</p>
        <p className="text-sm leading-relaxed">{prompt.promptVi}</p>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[var(--topik-ink-muted)]">
          {vi.writing.yourAnswer}
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={taskType === "54" ? 10 : taskType === "53" ? 7 : 4}
          placeholder="Viết câu trả lời bằng tiếng Hàn..."
          className="topik-textarea"
        />
        {prompt.wordLimit && (
          <p className="mt-1 text-[11px] text-[var(--topik-ink-muted)]">
            {answer.replace(/\s/g, "").length} / {prompt.wordLimit} ký tự
          </p>
        )}
      </div>

      {error && <p className="text-sm text-[var(--topik-primary)]">{error}</p>}

      <button type="submit" disabled={loading || !answer.trim()} className="topik-btn-primary">
        {loading ? vi.writing.submitting : vi.writing.submit}
      </button>
    </form>
  );
}
