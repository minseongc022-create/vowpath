"use client";

import { useCallback, useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import { getVocabDrills, type VocabDrill } from "@/topik/lib/drills/vocab";
import { IconKeyboard, IconMic, IconSparkle } from "@/topik/components/ui/TopikIcons";

export function VocabFillBlankClient() {
  const { locale, t } = useTopikLocale();
  const drills = getVocabDrills(10);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [showLength, setShowLength] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const drill: VocabDrill | undefined = drills[idx];

  const hint = locale === "vi" ? drill?.hintVi : drill?.hintEn;

  const renderSentence = useCallback(() => {
    if (!drill) return null;
    const parts = drill.sentenceKo.split("____");
    return (
      <p className="topik-vocab-target text-lg font-semibold leading-relaxed">
        {parts[0]}
        <span className="topik-vocab-blank">
          {showResult
            ? drill.blank
            : showLength
              ? "_".repeat(drill.blank.length)
              : answer || "____"}
        </span>
        {parts[1] ?? ""}
      </p>
    );
  }, [drill, showResult, showLength, answer]);

  function check() {
    if (!drill) return;
    const ok = answer.trim() === drill.blank || answer.trim().includes(drill.blank);
    setCorrect(ok);
    setShowResult(true);
    if (ok) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= drills.length) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setAnswer("");
    setShowResult(false);
    setCorrect(null);
    setShowLength(false);
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/vocab">
        <div className="topik-quiz-done">
          <p className="text-xl font-bold text-learn-ink">{t.quiz.finish}</p>
          <p className="mt-2 text-learn-ink-muted">
            {score}/{drills.length}
          </p>
        </div>
      </QuizSessionShell>
    );
  }

  if (!drill) return null;

  return (
    <QuizSessionShell
      current={idx}
      total={drills.length}
      backHref="/topik/vocab"
      footer={
        <div className="topik-quiz-controls">
          <button type="button" className="topik-quiz-utility" onClick={() => setShowLength((v) => !v)}>
            <IconSparkle size={20} />
            <span>{t.quiz.showLength}</span>
          </button>
          <button
            type="button"
            className="topik-quiz-utility"
            onClick={() => setKeyboardMode((v) => !v)}
          >
            <IconKeyboard size={20} />
            <span>{t.quiz.keyboardMode}</span>
          </button>
        </div>
      }
    >
      <QuizLevelBadge level={drill.level} isNew={drill.isNew} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-hint">{hint}</div>
        <div className="topik-quiz-card-body">{renderSentence()}</div>
        {drill.source ? (
          <p className="topik-quiz-source">[{drill.source}]</p>
        ) : null}
      </div>

      {keyboardMode ? (
        <div className="topik-vocab-input-wrap">
          <input
            className="topik-input text-center text-lg"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t.quiz.placeholder}
            disabled={showResult}
            onKeyDown={(e) => e.key === "Enter" && !showResult && check()}
          />
        </div>
      ) : (
        <button type="button" className="topik-mic-btn" aria-label="Voice input">
          <IconMic size={28} />
        </button>
      )}

      {showResult && (
        <p className={`topik-quiz-feedback ${correct ? "topik-quiz-feedback-ok" : "topik-quiz-feedback-bad"}`}>
          {correct ? t.quiz.correct : t.quiz.wrong}
        </p>
      )}

      <div className="topik-quiz-actions">
        {!showResult ? (
          <button type="button" className="topik-btn topik-btn-primary topik-btn-lg" onClick={check} disabled={!answer.trim()}>
            {t.quiz.confirm}
          </button>
        ) : (
          <button type="button" className="topik-btn topik-btn-primary topik-btn-lg" onClick={next}>
            {idx + 1 >= drills.length ? t.quiz.finish : t.quiz.next}
          </button>
        )}
      </div>
    </QuizSessionShell>
  );
}
