"use client";

import { useState } from "react";
import type { WritingTaskType, WritingCorrectionResult } from "@/topik/types";
import { WRITING_PROMPTS } from "@/topik/lib/writing/prompts";
import { vi } from "@/topik/lib/i18n/vi";
import { WritingResult } from "@/topik/components/writing/WritingResult";

const TASK_TYPES: WritingTaskType[] = ["51", "52", "53", "54"];

export function WritingCorrectionForm() {
  const [taskType, setTaskType] = useState<WritingTaskType>("53");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WritingCorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prompt = WRITING_PROMPTS[taskType];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
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
      if (!res.ok) throw new Error("FAILED");
      setResult(await res.json());
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
    <form onSubmit={handleSubmit} className="space-y-4 learn-animate-in">
      <div>
        <label className="mb-2 block text-xs font-bold text-learn-ink-muted uppercase tracking-wide">
          {vi.writing.taskType}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TASK_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTaskType(t)}
              className={`rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-all active:scale-[0.98] ${
                taskType === t
                  ? "border-learn-primary bg-learn-primary/10 text-learn-primary"
                  : "border-learn-border bg-learn-surface text-learn-ink"
              }`}
            >
              {vi.writing.tasks[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="topik-card p-4">
        <p className="text-xs font-bold text-learn-ink-muted mb-1">{vi.writing.prompt}</p>
        <p className="text-sm text-learn-ink whitespace-pre-wrap leading-relaxed">{prompt.promptVi}</p>
        <p className="mt-2 text-xs text-learn-ink-subtle whitespace-pre-wrap">{prompt.prompt}</p>
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold text-learn-ink-muted uppercase tracking-wide">
          {vi.writing.yourAnswer}
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={taskType === "54" ? 12 : taskType === "53" ? 8 : 4}
          placeholder="한국어로 답을 작성하세요..."
          className="w-full rounded-2xl border border-learn-border bg-learn-surface px-4 py-3 text-sm text-learn-ink placeholder:text-learn-ink-subtle focus:border-learn-primary focus:outline-none focus:ring-2 focus:ring-learn-primary/20 resize-none"
        />
        {prompt.wordLimit && (
          <p className="mt-1 text-[11px] text-learn-ink-muted">
            {answer.replace(/\s/g, "").length} / {prompt.wordLimit} ký tự
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !answer.trim()}
        className="w-full rounded-2xl bg-learn-primary py-3.5 text-sm font-bold text-white shadow-learn-md active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {loading ? vi.writing.submitting : vi.writing.submit}
      </button>
    </form>
  );
}
