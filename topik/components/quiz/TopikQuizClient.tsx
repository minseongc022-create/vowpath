"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopikQuizQuestion, TopikLevel } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

type Props = {
  initialLevel?: TopikLevel;
};

export function TopikQuizClient({ initialLevel }: Props) {
  const [level, setLevel] = useState<TopikLevel>(initialLevel ?? 1);
  const [questions, setQuestions] = useState<TopikQuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuestions = useCallback(async (lv: TopikLevel) => {
    setLoading(true);
    const res = await fetch(`/topik/api/quiz?level=${lv}&limit=8`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setScore(0);
    setFinished(false);
    setShowResult(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQuestions(level);
  }, [level, loadQuestions]);

  const q = questions[idx];

  function checkAnswer(): boolean {
    if (!q) return false;
    if (q.type === "multiple_choice") {
      return selected === q.correctIndex;
    }
    const normalized = textAnswer.trim().toLowerCase();
    const expected = (q.correctAnswer ?? "").trim().toLowerCase();
    return normalized === expected || normalized.includes(expected);
  }

  async function handleSubmit() {
    if (!q) return;
    const isCorrect = checkAnswer();
    setCorrect(isCorrect);
    setShowResult(true);
    if (isCorrect) setScore((s) => s + 1);

    if (!isCorrect) {
      await fetch("/topik/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "wrong",
          questionId: q.id,
          question: q.question,
          questionVi: q.questionVi,
          options: q.options,
          correctIndex: q.correctIndex,
          correctAnswer: q.correctAnswer,
          selectedIndex: selected ?? undefined,
          textAnswer: textAnswer || undefined,
          explanationVi: q.explanationVi,
          level: q.level,
        }),
      });
    }
  }

  function handleNext() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setTextAnswer("");
    setShowResult(false);
    setCorrect(null);
  }

  if (loading) {
    return <p className="text-center text-sm text-learn-ink-muted py-12">{vi.common.loading}</p>;
  }

  if (finished) {
    return (
      <div className="topik-card p-6 text-center topik-animate-in">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-lg font-bold text-learn-ink">{vi.practice.score}</p>
        <p className="text-3xl font-bold text-learn-primary mt-1">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-learn-ink-muted mt-2">
          {Math.round((score / questions.length) * 100)}% — Câu sai đã thêm vào ôn tập SRS
        </p>
        <button
          type="button"
          onClick={() => void loadQuestions(level)}
          className="mt-4 w-full topik-btn topik-btn-primary topik-btn-md"
        >
          {vi.common.retry}
        </button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="space-y-4 topik-animate-in">
      <div className="flex items-center justify-between">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
          className="rounded-xl border border-learn-border bg-learn-surface px-3 py-2 text-sm font-semibold"
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>TOPIK {l}</option>
          ))}
        </select>
        <span className="text-xs font-bold text-learn-ink-muted">
          {idx + 1} / {questions.length}
        </span>
      </div>

      <div className="topik-card p-4">
        {q.passage && (
          <p className="mb-3 text-xs text-learn-ink-muted border-l-2 border-learn-primary pl-3">{q.passage}</p>
        )}
        <p className="text-sm font-semibold text-learn-ink">{q.questionVi ?? q.question}</p>
        <p className="mt-1 text-xs text-learn-ink-subtle">{q.question}</p>
      </div>

      {q.type === "multiple_choice" && q.options && (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={showResult}
              onClick={() => setSelected(i)}
              className={`topik-option font-medium ${
                showResult && i === q.correctIndex
                  ? "topik-option-correct"
                  : showResult && i === selected && i !== q.correctIndex
                    ? "topik-option-wrong"
                    : selected === i
                      ? "topik-option-selected"
                      : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {q.type === "short_answer" && (
        <input
          type="text"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={showResult}
          placeholder="Nhập câu trả lời..."
          className="topik-input"
        />
      )}

      {showResult && (
        <div className={`rounded-2xl p-4 ${correct ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`text-sm font-bold ${correct ? "text-green-700" : "text-red-700"}`}>
            {correct ? `✓ ${vi.practice.correct}` : `✗ ${vi.practice.wrong}`}
          </p>
          <p className="mt-1 text-xs text-learn-ink-muted">{q.explanationVi}</p>
        </div>
      )}

      {!showResult ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={q.type === "multiple_choice" ? selected === null : !textAnswer.trim()}
          className="w-full topik-btn topik-btn-primary topik-btn-lg disabled:opacity-50"
        >
          {vi.practice.submit}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          className="w-full topik-btn topik-btn-primary topik-btn-lg"
        >
          {idx + 1 >= questions.length ? vi.practice.score : vi.practice.next}
        </button>
      )}
    </div>
  );
}
