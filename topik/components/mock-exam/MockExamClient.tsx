"use client";

import { useCallback, useEffect, useState } from "react";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { getQuestionSection, ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
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
  const [showScript, setShowScript] = useState(false);
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
    setShowScript(false);
    setTimeLeft(DURATION_SEC);
    setStartedAt(Date.now());
    setPhase("exam");
    setLoading(false);
  }

  const q = questions[idx];
  const currentSection = q ? getQuestionSection(q) : "";

  function handleNext() {
    if (!q || selected === null) return;
    const nextAnswers = { ...answers, [q.id]: selected };
    setAnswers(nextAnswers);
    if (idx + 1 >= questions.length) {
      void finishExam(nextAnswers);
      return;
    }
    setIdx((i) => i + 1);
    setShowScript(false);
    const nextQ = questions[idx + 1];
    setSelected(
      typeof nextAnswers[nextQ?.id ?? ""] === "number"
        ? (nextAnswers[nextQ!.id] as number)
        : null,
    );
  }

  if (phase === "setup") {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.mockExam.subtitle}</p>
          <ul className="topik-setup-list">
            <li>10 câu · 3 nghe + 4 đọc + 3 ngữ pháp/từ vựng</li>
            <li>Đồng hồ 20 phút · giao diện IBT</li>
            <li>Script nghe + giải thích tiếng Việt</li>
            <li>Tự động lưu điểm cao nhất</li>
            <li>Không quảng cáo · không paywall</li>
          </ul>
        </div>
        <label className="topik-field-label">{vi.mockExam.level}</label>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
          className="topik-select"
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>
              TOPIK {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void startExam()}
          disabled={loading}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {loading ? vi.common.loading : vi.mockExam.start}
        </button>
      </div>
    );
  }

  if (phase === "result" && result) {
    const pct = Math.round((result.score / result.maxScore) * 100);
    return (
      <div className="topik-quiz-shell topik-animate-in text-center">
        <div className="topik-card topik-card-pad">
          <p className="topik-section-title">{vi.mockExam.result}</p>
          <p className="topik-result-score">{pct}%</p>
          <p className="topik-result-hint">
            {vi.mockExam.correct}: {result.correct}/{result.total} · {result.score}/{result.maxScore} đ
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPhase("setup");
            setResult(null);
          }}
          className="topik-btn topik-btn-primary topik-btn-lg"
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
    <div className="topik-quiz-shell topik-animate-in">
      <div className="topik-exam-bar">
        <span className="topik-exam-section">{ibtSectionLabel(currentSection)}</span>
        <span className="topik-exam-progress">
          {vi.mockExam.question} {idx + 1}/{questions.length}
        </span>
        <span className={`topik-exam-timer ${timeLeft < 120 ? "topik-exam-timer-warn" : ""}`}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>

      <div className="topik-card topik-card-pad">
        <span className="topik-badge">IBT · TOPIK {q.level}</span>
        {q.category === "listening" && q.listeningScript && (
          <div className="topik-listening-block">
            <p className="topik-listening-hint">{vi.listening.playHint}</p>
            <button
              type="button"
              onClick={() => setShowScript((s) => !s)}
              className="topik-btn topik-btn-outline topik-btn-sm"
            >
              {showScript ? vi.listening.hideScript : vi.listening.showScript}
            </button>
            {showScript && (
              <div className="topik-script-box font-ko">
                <p className="topik-script-ko">{q.listeningScript}</p>
                {q.listeningScriptVi && (
                  <p className="topik-script-vi">{q.listeningScriptVi}</p>
                )}
              </div>
            )}
          </div>
        )}
        {q.passage && <p className="topik-passage font-ko">{q.passage}</p>}
        <p className="topik-question-ko font-ko">{q.question}</p>
        {q.questionVi && <p className="topik-question-vi">{q.questionVi}</p>}
      </div>

      <div className="topik-option-list">
        {q.options?.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(i)}
            className={`topik-option ${selected === i ? "topik-option-selected" : ""}`}
          >
            {i + 1}. {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleNext}
        disabled={selected === null || loading}
        className="topik-btn topik-btn-primary topik-btn-lg"
      >
        {idx + 1 >= questions.length ? vi.mockExam.finish : vi.mockExam.next}
      </button>
    </div>
  );
}
