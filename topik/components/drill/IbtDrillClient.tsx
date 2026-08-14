"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";
import { ibtSectionLabel } from "@/topik/lib/mock-exam/ibt-exam";
import { DRILL_TYPES, type DrillType } from "@/topik/lib/quiz/drill";
import { checkQuizAnswer } from "@/topik/lib/quiz/check-answer";
import { vi } from "@/topik/lib/i18n/vi";
import { quizExplanationText } from "@/topik/lib/i18n/content-locale";
import { isKoLocale } from "@/topik/lib/i18n/locale-text";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { ListeningAudioPlayer } from "@/topik/components/listening/ListeningAudioPlayer";
import { SentenceOrderInput } from "@/topik/components/quiz/SentenceOrderInput";

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
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [order, setOrder] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inSession, setInSession] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const loadQuestions = useCallback(async (type: DrillType, lv: TopikLevel) => {
    setLoading(true);
    const params = new URLSearchParams({ type, level: String(lv) });
    const res = await fetch(`/topik/api/drill?${params}`);
    const data = (await res.json()) as TopikQuizQuestion[];
    setQuestions(data);
    setIdx(0);
    setScore(0);
    setFinished(false);
    setShowResult(false);
    setInSession(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (inSession) return;
    void loadQuestions(drillType, level);
  }, [drillType, level, inSession, loadQuestions]);

  useEffect(() => {
    if (inSession && !finished && questions.length > 0) {
      setFocusProgress(`${idx + 1}/${questions.length}`);
    }
  }, [inSession, finished, idx, questions.length, setFocusProgress]);

  useEffect(() => {
    if (finished) leaveFocus();
  }, [finished, leaveFocus]);

  const q = questions[idx];
  const drillMeta = DRILL_TYPES.find((d) => d.id === drillType);

  function startSession() {
    enterFocus({
      title: vi.drill.title,
      subtitle: drillMeta?.titleVi ?? drillType,
      exitHref: "/topik/drill",
    });
    setInSession(true);
    setIdx(0);
    setScore(0);
    setFinished(false);
    resetAnswer();
  }

  function resetAnswer() {
    setSelected(null);
    setTextAnswer("");
    setOrder([]);
    setShowResult(false);
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

  async function handleSubmit() {
    if (!q) return;
    const isCorrect = checkQuizAnswer(q, { selectedIndex: selected, textAnswer, order });
    setCorrect(isCorrect);
    setShowResult(true);
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      await saveWrong();
    }
  }

  function handleRetry() {
    resetAnswer();
  }

  function handleNext() {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    resetAnswer();
  }

  const canSubmit =
    q?.type === "multiple_choice"
      ? selected !== null
      : q?.type === "sentence_order"
        ? order.length === (q.fragments?.length ?? 0)
        : !!textAnswer.trim();

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
        </div>
        <button
          type="button"
          onClick={startSession}
          disabled={questions.length === 0}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {vi.drill.start}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="topik-card topik-card-pad text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
        <p className="topik-result-label">{vi.drill.result}</p>
        <p className="topik-result-score">
          {score} / {questions.length}
        </p>
        <p className="topik-result-hint">{Math.round((score / questions.length) * 100)}%</p>
        <button
          type="button"
          onClick={() => void loadQuestions(drillType, level)}
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
    <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
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
          fragments={q.fragments}
          value={order}
          onChange={setOrder}
          disabled={showResult}
          showResult={showResult}
          correctOrder={q.correctOrder}
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
        <div className={`topik-feedback ${correct ? "topik-feedback-ok" : "topik-feedback-no"}`}>
          <p className="topik-feedback-title">
            {correct ? `✓ ${vi.practice.correct}` : `✗ ${vi.practice.wrong}`}
          </p>
          <p className="topik-feedback-text">{quizExplanationText(q)}</p>
        </div>
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
