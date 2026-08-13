"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { vi } from "@/topik/lib/i18n/vi";

type Phase = "setup" | "exam" | "result";

type ExamResult = {
  correct: number;
  total: number;
  score: number;
  maxScore: number;
  durationSec: number;
};

const DURATION_SEC = 20 * 60;

export function MockExamClient() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [level, setLevel] = useState<TopikLevel>(3);
  const [questions, setQuestions] = useState<TopikQuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(DURATION_SEC);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);

  const finishExam = useCallback(
    async (finalAnswers: Record<string, number | string>) => {
      if (!startedAt) return;
      setLoading(true);
      const durationSec = Math.round((Date.now() - startedAt) / 1000);
      try {
        const res = await fetch("/topik/api/mock-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level,
            answers: finalAnswers,
            questionIds: questions.map((x) => x.id),
            durationSec,
          }),
        });
        const data = (await res.json()) as ExamResult;
        setResult(data);
        setPhase("result");
      } finally {
        setLoading(false);
      }
    },
    [level, questions, startedAt],
  );

  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase === "exam" && timeLeft <= 0) {
      void finishExam(answers);
    }
  }, [phase, timeLeft, finishExam, answers]);

  async function startExam() {
    setLoading(true);
    const res = await fetch(`/topik/api/mock-exam?level=${level}`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setAnswers({});
    setSelected(null);
    setTimeLeft(DURATION_SEC);
    setStartedAt(Date.now());
    setPhase("exam");
    setLoading(false);
  }

  const q = questions[idx];

  function handleNext() {
    if (!q || selected === null) return;
    const nextAnswers = { ...answers, [q.id]: selected };
    setAnswers(nextAnswers);
    if (idx + 1 >= questions.length) {
      void finishExam(nextAnswers);
      return;
    }
    setIdx((i) => i + 1);
    const nextQ = questions[idx + 1];
    setSelected(typeof nextAnswers[nextQ?.id ?? ""] === "number" ? (nextAnswers[nextQ!.id] as number) : null);
  }

  if (phase === "setup") {
    return (
      <div className="space-y-4 topik-animate-in">
        <div className="topik-card p-4">
          <p className="text-sm text-learn-ink-muted">{vi.mockExam.subtitle}</p>
          <ul className="mt-3 space-y-1 text-xs text-learn-ink">
            <li>• 10 câu trắc nghiệm TOPIK IBT</li>
            <li>• Đồng hồ đếm ngược 20 phút</li>
            <li>• Tự động lưu điểm cao nhất</li>
          </ul>
        </div>
        <div>
          <label className="text-xs font-bold text-learn-ink-muted">{vi.mockExam.level}</label>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
            className="mt-1 w-full rounded-xl border border-learn-border px-3 py-2 text-sm"
          >
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <option key={l} value={l}>TOPIK {l}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void startExam()}
          disabled={loading}
          className="w-full rounded-2xl bg-learn-accent py-3.5 text-sm font-bold text-white"
        >
          {loading ? vi.common.loading : vi.mockExam.start}
        </button>
      </div>
    );
  }

  if (phase === "result" && result) {
    const pct = Math.round((result.score / result.maxScore) * 100);
    return (
      <div className="space-y-4 topik-animate-in text-center">
        <div className="topik-card p-6">
          <p className="text-xs font-bold uppercase text-learn-ink-muted">{vi.mockExam.result}</p>
          <p className="mt-2 text-5xl font-bold text-learn-primary">{pct}%</p>
          <p className="mt-2 text-sm text-learn-ink">
            {vi.mockExam.correct}: {result.correct}/{result.total} · {result.score}/{result.maxScore} đ
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPhase("setup");
            setResult(null);
          }}
          className="w-full topik-btn topik-btn-primary topik-btn-md"
        >
          {vi.mockExam.retry}
        </button>
      </div>
    );
  }

  if (!q) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="space-y-4 topik-animate-in">
      <div className="flex items-center justify-between topik-card px-4 py-3">
        <span className="text-xs font-bold text-learn-ink-muted">
          {vi.mockExam.question} {idx + 1}/{questions.length}
        </span>
        <span className={`text-sm font-mono font-bold ${timeLeft < 120 ? "text-red-600" : "text-learn-accent"}`}>
          {vi.mockExam.timeLeft}: {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="topik-card p-4">
        <span className="topik-badge mb-2">IBT · TOPIK {q.level}</span>
        {q.passage && (
          <p className="mb-3 text-sm text-learn-ink-muted leading-relaxed border-l-2 border-learn-primary pl-3">
            {q.passage}
          </p>
        )}
        <p className="text-sm font-medium text-learn-ink">{q.question}</p>
        {q.questionVi && <p className="mt-1 text-xs text-learn-ink-muted">{q.questionVi}</p>}
      </div>

      <div className="space-y-2">
        {q.options?.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(i)}
          className={`topik-option ${selected === i ? "topik-option-selected font-semibold" : ""}`}
          >
            {i + 1}. {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={selected === null || loading}
        className="w-full topik-btn topik-btn-primary topik-btn-lg disabled:opacity-50"
      >
        {idx + 1 >= questions.length ? vi.mockExam.finish : vi.mockExam.next}
      </button>
    </div>
  );
}
