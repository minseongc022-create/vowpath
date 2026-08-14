"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TopikQuizQuestion, TopikLevel } from "@/topik/types";
import { ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
import { vi } from "@/topik/lib/i18n/vi";
import {
  quizExplanationText,
  quizListeningScriptVi,
} from "@/topik/lib/i18n/content-locale";
import { isKoLocale } from "@/topik/lib/i18n/locale-text";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";

const CATEGORIES = [
  { value: "", label: vi.practice.all },
  { value: "listening", label: vi.practice.categories.listening },
  { value: "reading", label: vi.practice.categories.reading },
  { value: "grammar", label: vi.practice.categories.grammar },
  { value: "vocabulary", label: vi.practice.categories.vocabulary },
];

type Props = {
  initialLevel?: TopikLevel;
};

export function TopikQuizClient({ initialLevel }: Props) {
  const searchParams = useSearchParams();
  const urlLevel = searchParams.get("level");
  const urlCategory = searchParams.get("category");

  const [level, setLevel] = useState<TopikLevel>(
    urlLevel ? (Number(urlLevel) as TopikLevel) : (initialLevel ?? 1),
  );
  const [category, setCategory] = useState(urlCategory ?? "");
  const [questions, setQuestions] = useState<TopikQuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadQuestions = useCallback(async (lv: TopikLevel, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams({ level: String(lv), limit: "15" });
    if (cat) params.set("category", cat);
    const res = await fetch(`/topik/api/quiz?${params}`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setScore(0);
    setFinished(false);
    setShowResult(false);
    setShowScript(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQuestions(level, category);
  }, [level, category, loadQuestions]);

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
    setShowScript(false);
    setCorrect(null);
  }

  if (loading) {
    return <p className="topik-loading">{vi.common.loading}</p>;
  }

  if (finished) {
    return (
      <div className="topik-card topik-card-pad text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
        <p className="topik-result-label">{vi.practice.score}</p>
        <p className="topik-result-score">
          {score} / {questions.length}
        </p>
        <p className="topik-result-hint">
          {Math.round((score / questions.length) * 100)}% — Câu sai đã thêm vào ôn tập SRS
        </p>
        <button
          type="button"
          onClick={() => void loadQuestions(level, category)}
          className="topik-btn topik-btn-primary topik-btn-lg mt-4"
        >
          {vi.common.retry}
        </button>
      </div>
    );
  }

  if (!q) return null;

  const section = q.examSection ?? q.category;

  return (
    <div className="topik-quiz-shell topik-animate-in">
      <StudyModeHint />
      <div className="topik-quiz-filters">
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
          className="topik-select"
          aria-label={vi.practice.filterLevel}
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>
              TOPIK {l}
            </option>
          ))}
        </select>
        <div className="topik-pill-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`topik-pill ${category === c.value ? "topik-pill-active" : ""}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <span className="topik-quiz-progress">
          {idx + 1} / {questions.length}
        </span>
      </div>

      <div className="topik-card topik-card-pad">
        <span className="topik-badge">{ibtSectionLabel(section)}</span>
        {q.category === "listening" && q.listeningScript && !showResult && (
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
              <div className="topik-script-box">
                <p className="topik-script-label">{vi.listening.scriptLabel}</p>
                <p className="topik-script-ko">
                  <KoreanStudyText text={q.listeningScript} studyMode />
                </p>
                {quizListeningScriptVi(q) && (
                  <p className="topik-script-vi">{quizListeningScriptVi(q)}</p>
                )}
              </div>
            )}
          </div>
        )}
        {q.passage && (
          <p className="topik-passage">
            <KoreanStudyText text={q.passage} studyMode />
          </p>
        )}
        <p className="topik-question-ko">
          <KoreanStudyText text={q.question} studyMode />
        </p>
        {!isKoLocale() && q.questionVi && (
          <p className="topik-question-vi">{q.questionVi}</p>
        )}
      </div>

      {q.type === "multiple_choice" && q.options && (
        <div className="topik-option-list">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={showResult}
              onClick={() => setSelected(i)}
              className={`topik-option ${
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
          placeholder={vi.practice.answerPlaceholder}
          className="topik-input"
        />
      )}

      {showResult && (
        <div className={`topik-feedback ${correct ? "topik-feedback-ok" : "topik-feedback-no"}`}>
          <p className="topik-feedback-title">
            {correct ? `✓ ${vi.practice.correct}` : `✗ ${vi.practice.wrong}`}
          </p>
          <p className="topik-feedback-text">{quizExplanationText(q)}</p>
          {q.listeningScript && (
            <div className="topik-script-box mt-3">
              <p className="topik-script-label">{vi.listening.scriptLabel}</p>
              <p className="topik-script-ko">
                <KoreanStudyText text={q.listeningScript} studyMode />
              </p>
              {q.listeningScriptVi && (
                <p className="topik-script-vi">{q.listeningScriptVi}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!showResult ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={q.type === "multiple_choice" ? selected === null : !textAnswer.trim()}
          className="topik-btn topik-btn-primary topik-btn-lg"
        >
          {vi.practice.submit}
        </button>
      ) : (
        <button type="button" onClick={handleNext} className="topik-btn topik-btn-primary topik-btn-lg">
          {idx + 1 >= questions.length ? vi.practice.score : vi.practice.next}
        </button>
      )}
    </div>
  );
}
