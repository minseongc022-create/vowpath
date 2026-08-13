"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopikQuizQuestion, TopikLevel } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";
import { useTopikStore } from "@/topik/components/providers/TopikStoreProvider";

export function TopikQuizClient({ initialLevel }: { initialLevel?: TopikLevel }) {
  const { addWrong } = useTopikStore();
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
    setQuestions(await res.json());
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
    if (q.type === "multiple_choice") return selected === q.correctIndex;
    const n = textAnswer.trim().toLowerCase();
    const e = (q.correctAnswer ?? "").trim().toLowerCase();
    return n === e || n.includes(e);
  }

  function handleSubmit() {
    if (!q) return;
    const ok = checkAnswer();
    setCorrect(ok);
    setShowResult(true);
    if (ok) setScore((s) => s + 1);
    else {
      addWrong({
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
    return (
      <div className="space-y-3">
        <div className="topik-skeleton h-10" />
        <div className="topik-skeleton h-32" />
        <div className="topik-skeleton h-12" />
      </div>
    );
  }

  if (finished) {
    return (
      <div className="topik-card-elevated p-6 text-center topik-animate-in">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-lg font-bold">{vi.practice.score}</p>
        <p className="text-3xl font-extrabold text-[var(--topik-primary)] mt-1">
          {score} / {questions.length}
        </p>
        <p className="text-sm text-[var(--topik-ink-muted)] mt-2">
          Câu sai đã thêm vào ôn tập
        </p>
        <button type="button" onClick={() => void loadQuestions(level)} className="topik-btn-primary mt-4">
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
          className="topik-input !w-auto py-2"
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>TOPIK {l}</option>
          ))}
        </select>
        <span className="text-xs font-bold text-[var(--topik-ink-muted)]">{idx + 1}/{questions.length}</span>
      </div>

      <div className="topik-card p-4">
        <p className="text-sm font-semibold">{q.questionVi ?? q.question}</p>
      </div>

      {q.type === "multiple_choice" && q.options && (
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={showResult}
              onClick={() => setSelected(i)}
              className={`w-full rounded-[var(--topik-radius)] border px-4 py-3 text-left text-sm font-medium transition-all ${
                showResult && i === q.correctIndex
                  ? "border-[var(--topik-success)] bg-green-50 text-green-800"
                  : showResult && i === selected
                    ? "border-[var(--topik-primary)] bg-red-50 text-red-800"
                    : selected === i
                      ? "border-[var(--topik-primary)] bg-[var(--topik-primary-soft)]"
                      : "border-[var(--topik-border)] bg-[var(--topik-surface)]"
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
        <div className={`rounded-[var(--topik-radius)] p-4 ${correct ? "bg-green-50" : "bg-red-50"}`}>
          <p className={`text-sm font-bold ${correct ? "text-green-700" : "text-red-700"}`}>
            {correct ? vi.practice.correct : vi.practice.wrong}
          </p>
          <p className="mt-1 text-xs text-[var(--topik-ink-muted)]">{q.explanationVi}</p>
        </div>
      )}

      {!showResult ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={q.type === "multiple_choice" ? selected === null : !textAnswer.trim()}
          className="topik-btn-primary"
        >
          {vi.practice.submit}
        </button>
      ) : (
        <button type="button" onClick={handleNext} className="topik-btn-primary">
          {idx + 1 >= questions.length ? vi.practice.score : vi.practice.next}
        </button>
      )}
    </div>
  );
}
