"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TopikQuizQuestion, TopikLevel } from "@/topik/types";
import { ibtSectionLabel, getQuestionSection } from "@/topik/lib/mock-exam/ibt-exam";
import { checkQuizAnswer, type SessionStats } from "@/topik/lib/quiz/check-answer";
import { vi } from "@/topik/lib/i18n/vi";
import { quizListeningScriptVi } from "@/topik/lib/i18n/content-locale";
import { isKoLocale } from "@/topik/lib/i18n/locale-text";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { ListeningAudioPlayer } from "@/topik/components/listening/ListeningAudioPlayer";
import { SentenceOrderInput } from "@/topik/components/quiz/SentenceOrderInput";
import { QuizProgressBar } from "@/topik/components/quiz/QuizProgressBar";
import { QuizFeedbackPanel } from "@/topik/components/quiz/QuizFeedbackPanel";
import { QuizResultSummary } from "@/topik/components/quiz/QuizResultSummary";

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
  const [order, setOrder] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [firstTryMisses, setFirstTryMisses] = useState(0);
  const [bySection, setBySection] = useState<SessionStats["bySection"]>({});
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inSession, setInSession] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const loadQuestions = useCallback(async (lv: TopikLevel, cat: string) => {
    setLoading(true);
    const params = new URLSearchParams({ level: String(lv), limit: "15" });
    if (cat) params.set("category", cat);
    const res = await fetch(`/topik/api/quiz?${params}`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setScore(0);
    setFirstTryCorrect(0);
    setFirstTryMisses(0);
    setBySection({});
    setFinished(false);
    setShowResult(false);
    setShowScript(false);
    setInSession(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadQuestions(level, category);
  }, [level, category, loadQuestions]);

  useEffect(() => {
    if (inSession && !finished && questions.length > 0) {
      setFocusProgress(`${idx + 1}/${questions.length}`);
    }
  }, [inSession, finished, idx, questions.length, setFocusProgress]);

  useEffect(() => {
    if (finished) leaveFocus();
  }, [finished, leaveFocus]);

  function startSession() {
    enterFocus({
      title: vi.practice.title,
      subtitle: `TOPIK ${level}`,
      exitHref: "/topik/practice",
    });
    setInSession(true);
    setIdx(0);
    setScore(0);
    setFirstTryCorrect(0);
    setFirstTryMisses(0);
    setBySection({});
    setFinished(false);
    setShowResult(false);
    setShowScript(false);
    setAttempts(0);
  }

  const q = questions[idx];

  function resetAnswer() {
    setSelected(null);
    setTextAnswer("");
    setOrder([]);
    setShowResult(false);
    setShowScript(false);
    setCorrect(null);
  }

  async function saveWrong() {
    if (!q) return;
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

  async function completePractice() {
    await fetch("/topik/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete-practice" }),
    });
  }

  async function handleSubmit() {
    if (!q) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = checkQuizAnswer(q, { selectedIndex: selected, textAnswer, order });
    setCorrect(isCorrect);
    setShowResult(true);

    if (isCorrect) {
      setScore((s) => s + 1);
      if (nextAttempts === 1) setFirstTryCorrect((n) => n + 1);
      const section = getQuestionSection(q);
      setBySection((prev) => {
        const sec = prev[section] ?? { correct: 0, total: 0 };
        return { ...prev, [section]: { correct: sec.correct + 1, total: sec.total + 1 } };
      });
    } else if (nextAttempts === 1) {
      setFirstTryMisses((n) => n + 1);
      await saveWrong();
    }
  }

  function handleRetry() {
    resetAnswer();
  }

  function handleNext() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      void completePractice();
      return;
    }
    setIdx((i) => i + 1);
    resetAnswer();
    setAttempts(0);
  }

  const canSubmit = useMemo(() => {
    if (!q) return false;
    if (q.type === "multiple_choice") return selected !== null;
    if (q.type === "sentence_order") return order.length === (q.fragments?.length ?? 0);
    return !!textAnswer.trim();
  }, [q, selected, order, textAnswer]);

  if (loading) {
    return <p className="topik-loading">{vi.common.loading}</p>;
  }

  if (!inSession && questions.length > 0) {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.practice.subtitle}</p>
          <div className="topik-quiz-filters mt-4">
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
          </div>
          <p className="topik-drill-preview-meta mt-3">
            {vi.drill.questionCount.replace("{n}", String(questions.length))}
          </p>
        </div>
        <button type="button" onClick={startSession} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.practice.start}
        </button>
      </div>
    );
  }

  if (finished) {
    const sessionStats: SessionStats = {
      total: questions.length,
      correct: score,
      wrong: firstTryMisses,
      firstTryCorrect,
      bySection,
    };
    return (
      <QuizResultSummary
        title={vi.practice.score}
        stats={sessionStats}
        onRetry={() => void loadQuestions(level, category)}
      />
    );
  }

  if (!q) return null;

  const section = getQuestionSection(q);

  return (
    <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
      <QuizProgressBar current={idx + 1} total={questions.length} />
      <div className="topik-card topik-card-pad">
        <span className="topik-badge">
          {ibtSectionLabel(section)} · {idx + 1}/{questions.length}
        </span>
        {q.category === "listening" && q.listeningScript && !showResult && (
          <div className="topik-listening-block">
            <ListeningAudioPlayer script={q.listeningScript} autoPlay maxPlays={3} />
            <button
              type="button"
              onClick={() => setShowScript((s) => !s)}
              className="topik-btn topik-btn-outline topik-btn-sm mt-3"
            >
              {showScript ? vi.listening.hideScript : vi.listening.showScript}
            </button>
            {showScript && (
              <div className="topik-script-box mt-3">
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

      {q.type === "sentence_order" && q.fragments && (
        <SentenceOrderInput
          key={q.id}
          fragments={q.fragments}
          correctOrder={q.correctOrder}
          value={order}
          onChange={setOrder}
          disabled={showResult}
          showResult={showResult}
        />
      )}

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
        <QuizFeedbackPanel
          question={q}
          correct={!!correct}
          attempts={attempts}
          listeningScript={
            q.listeningScript ? (
              <div className="topik-script-box mt-3">
                <p className="topik-script-label">{vi.listening.scriptLabel}</p>
                <p className="topik-script-ko">
                  <KoreanStudyText text={q.listeningScript} studyMode />
                </p>
                {q.listeningScriptVi && (
                  <p className="topik-script-vi">{q.listeningScriptVi}</p>
                )}
              </div>
            ) : undefined
          }
        />
      )}

      {!showResult ? (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="topik-btn topik-btn-primary topik-btn-lg"
        >
          {vi.practice.submit}
        </button>
      ) : correct ? (
        <button type="button" onClick={handleNext} className="topik-btn topik-btn-primary topik-btn-lg">
          {idx + 1 >= questions.length ? vi.practice.score : vi.practice.next}
        </button>
      ) : (
        <button type="button" onClick={handleRetry} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.practice.tryAgain}
        </button>
      )}
    </div>
  );
}
