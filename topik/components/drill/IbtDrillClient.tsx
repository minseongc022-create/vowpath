"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { ibtSectionLabel, getQuestionSection } from "@/topik/lib/mock-exam/ibt-exam";
import { DRILL_TYPES, getDrillPreview, type DrillType } from "@/topik/lib/quiz/drill";
import { postSessionComplete } from "@/topik/lib/quiz/session-complete";
import { checkQuizAnswer, type SessionStats } from "@/topik/lib/quiz/check-answer";
import { vi } from "@/topik/lib/i18n/vi";
import { isKoLocale } from "@/topik/lib/i18n/locale-text";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { ListeningAudioPlayer } from "@/topik/components/listening/ListeningAudioPlayer";
import { SentenceOrderInput } from "@/topik/components/quiz/SentenceOrderInput";
import { QuizProgressBar } from "@/topik/components/quiz/QuizProgressBar";
import { QuizFeedbackPanel } from "@/topik/components/quiz/QuizFeedbackPanel";
import { QuizResultSummary } from "@/topik/components/quiz/QuizResultSummary";

type Props = {
  initialLevel?: TopikLevel;
};

export function IbtDrillClient({ initialLevel }: Props) {
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type") as DrillType | null;
  const urlLevel = searchParams.get("level");

  const [level, setLevel] = useState<TopikLevel>(
    urlLevel ? (Number(urlLevel) as TopikLevel) : (initialLevel ?? 3),
  );
  const [drillType, setDrillType] = useState<DrillType>(urlType ?? "listening");
  const [questions, setQuestions] = useState<TopikQuizQuestion[]>([]);
  const [preview, setPreview] = useState<ReturnType<typeof getDrillPreview> | null>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [firstTryMisses, setFirstTryMisses] = useState(0);
  const [bySection, setBySection] = useState<SessionStats["bySection"]>({});
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inSession, setInSession] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const drillMeta = DRILL_TYPES.find((d) => d.id === drillType);

  const loadPreview = useCallback((type: DrillType, lv: TopikLevel) => {
    setLoading(true);
    const p = getDrillPreview(type, lv);
    setPreview(p);
    setQuestions(p.questions);
    setIdx(0);
    setScore(0);
    setFirstTryCorrect(0);
    setFirstTryMisses(0);
    setBySection({});
    setFinished(false);
    setShowResult(false);
    setInSession(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (inSession) return;
    loadPreview(drillType, level);
  }, [drillType, level, inSession, loadPreview]);

  useEffect(() => {
    if (inSession && !finished && questions.length > 0) {
      setFocusProgress(`${idx + 1}/${questions.length}`);
    }
  }, [inSession, finished, idx, questions.length, setFocusProgress]);

  useEffect(() => {
    if (finished) leaveFocus();
  }, [finished, leaveFocus]);

  const q = questions[idx];

  function resetAnswer() {
    setSelected(null);
    setTextAnswer("");
    setOrder([]);
    setShowResult(false);
    setCorrect(null);
  }

  function startSession() {
    if (!preview?.hasEnough) return;
    enterFocus({
      title: vi.drill.title,
      subtitle: drillMeta?.titleVi ?? drillType,
      exitHref: "/topik/drill",
    });
    setInSession(true);
    setIdx(0);
    setScore(0);
    setFirstTryCorrect(0);
    setFirstTryMisses(0);
    setBySection({});
    setFinished(false);
    resetAnswer();
    setAttempts(0);
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

  async function completeDrill() {
    await postSessionComplete("complete-drill", bySection);
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
      void completeDrill();
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

  if (loading && !inSession) {
    return <p className="topik-loading">{vi.common.loading}</p>;
  }

  if (!inSession) {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.drill.subtitle}</p>
          <select
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
            className="topik-select mt-4"
          >
            {[1, 2, 3, 4, 5, 6].map((l) => (
              <option key={l} value={l}>
                TOPIK {l}
              </option>
            ))}
          </select>
          <div className="topik-drill-grid mt-4">
            {DRILL_TYPES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDrillType(d.id)}
                className={`topik-drill-card ${drillType === d.id ? "topik-drill-card-active" : ""}`}
              >
                <span className="topik-drill-card-title">{d.titleVi}</span>
                <span className="topik-drill-card-desc">{d.descVi}</span>
              </button>
            ))}
          </div>
          {preview && (
            <div className="topik-drill-preview mt-4">
              <p className="topik-drill-preview-title">{vi.drill.previewTitle}</p>
              <p className="topik-drill-preview-meta">
                {vi.drill.questionCount.replace("{n}", String(preview.count))}
                {" · "}
                {vi.drill.estimatedMin.replace("{n}", String(preview.estimatedMin))}
              </p>
              {!preview.hasEnough && (
                <p className="topik-drill-preview-warn">{vi.drill.insufficient}</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={startSession}
          disabled={!preview?.hasEnough}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {vi.drill.start}
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
        title={vi.drill.result}
        stats={sessionStats}
        level={level}
        onRetry={() => loadPreview(drillType, level)}
        homeHref="/topik/drill"
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
          <div className="topik-listening-block mt-3">
            <ListeningAudioPlayer script={q.listeningScript} autoPlay maxPlays={3} />
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

      {showResult && (
        <QuizFeedbackPanel question={q} correct={!!correct} attempts={attempts} />
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
          {idx + 1 >= questions.length ? vi.drill.result : vi.practice.next}
        </button>
      ) : (
        <button type="button" onClick={handleRetry} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.practice.tryAgain}
        </button>
      )}
    </div>
  );
}
