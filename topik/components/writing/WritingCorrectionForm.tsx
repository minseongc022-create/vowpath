"use client";

import { useState } from "react";
import type { WritingTaskType, WritingCorrectionResult } from "@/topik/types";
import { WRITING_PROMPTS } from "@/topik/lib/writing/prompts";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { WritingResult } from "@/topik/components/writing/WritingResult";

const TASK_TYPES: WritingTaskType[] = ["51", "52", "53", "54"];

export function WritingCorrectionForm() {
  const vi = useTopikVi();

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
    <form onSubmit={handleSubmit} className="space-y-4 topik-animate-in">
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
              className={`topik-pill text-left !rounded-2xl !py-2.5 ${
                taskType === t ? "topik-pill-active" : ""
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
          className="topik-textarea"
        />
        {prompt.wordLimit && (
          <p
            className={`topik-char-count ${
              prompt.minChars &&
              answer.replace(/\s/g, "").length >= prompt.minChars &&
              answer.replace(/\s/g, "").length <= prompt.wordLimit
                ? "topik-char-count-ok"
                : prompt.minChars && answer.replace(/\s/g, "").length > 0
                  ? "topik-char-count-warn"
                  : ""
            }`}
          >
            {answer.replace(/\s/g, "").length}
            {prompt.minChars ? ` / ${prompt.minChars}–${prompt.wordLimit}` : ` / ${prompt.wordLimit}`} ký tự
            {taskType === "53" && " · IBT 2025"}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || !answer.trim()}
        className="w-full topik-btn topik-btn-primary topik-btn-lg shadow-learn-md active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {loading ? vi.writing.submitting : vi.writing.submit}
      </button>
    </form>
  );
}
