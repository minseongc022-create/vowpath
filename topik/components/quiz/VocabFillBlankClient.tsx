"use client";

import { useCallback, useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import { getVocabDrills, type VocabDrill } from "@/topik/lib/drills/vocab";
import { cn } from "@/learn/lib/utils";

export function VocabFillBlankClient() {
  const { locale, t } = useTopikLocale();
  const drills = getVocabDrills(8);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showRomanization, setShowRomanization] = useState(false);

  const drill: VocabDrill | undefined = drills[idx];
  const meaning = locale === "vi" ? drill?.meaningVi : drill?.meaningEn;

  function check() {
    if (!drill || selected === null) return;
    setShowResult(true);
    if (selected === drill.correctIndex) setScore((s) => s + 1);
  }

  function next() {
    if (idx + 1 >= drills.length) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setShowResult(false);
    setShowRomanization(false);
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/vocab">
        <div className="topik-quiz-done">
          <p className="text-lg font-bold">{t.quiz.finish}</p>
          <p className="mt-2 text-learn-ink-muted">
            {score}/{drills.length}
          </p>
          <a href="/topik/review" className="topik-btn topik-btn-primary topik-btn-md mt-4">
            Thêm vào ôn tập SRS
          </a>
        </div>
      </QuizSessionShell>
    );
  }

  if (!drill) return null;

  return (
    <QuizSessionShell current={idx} total={drills.length} backHref="/topik/vocab">
      <QuizLevelBadge level={drill.level} isNew={drill.isNew} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-hint">{meaning}</div>
        <div className="topik-quiz-card-body">
          {showResult && (
            <>
              <p className="topik-ko-display font-ko">{drill.wordKo}</p>
              {showRomanization && (
                <p className="topik-romanization mt-1">{drill.romanization}</p>
              )}
              <p className="mt-3 text-center text-sm text-learn-ink-muted font-ko">{drill.exampleKo}</p>
              <p className="text-center text-xs text-learn-ink-subtle">{drill.exampleVi}</p>
            </>
          )}
          {!showResult && (
            <p className="text-center text-sm text-learn-ink-muted">Chọn từ tiếng Hàn đúng</p>
          )}
        </div>
      </div>

      <div className="topik-option-list mt-4">
        {drill.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = showResult && i === drill.correctIndex;
          const isWrong = showResult && isSelected && i !== drill.correctIndex;
          return (
            <button
              key={opt}
              type="button"
              disabled={showResult}
              className={cn(
                "topik-option font-ko",
                isSelected && !showResult && "topik-option-selected",
                isCorrect && "topik-option-correct",
                isWrong && "topik-option-wrong",
              )}
              onClick={() => setSelected(i)}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {!showResult && (
        <button
          type="button"
          className="topik-btn topik-btn-ghost topik-btn-sm mt-2 w-full"
          onClick={() => setShowRomanization((v) => !v)}
        >
          {showRomanization ? "Ẩn phiên âm" : "Xem phiên âm gợi ý"}
        </button>
      )}

      {showResult && drill.vnTip && (
        <p className="topik-vn-tip">{drill.vnTip}</p>
      )}

      {showResult && (
        <p className={`topik-quiz-feedback ${selected === drill.correctIndex ? "topik-quiz-feedback-ok" : "topik-quiz-feedback-bad"}`}>
          {selected === drill.correctIndex ? t.quiz.correct : t.quiz.wrong}
        </p>
      )}

      <div className="topik-quiz-actions">
        {!showResult ? (
          <button
            type="button"
            className="topik-btn topik-btn-primary topik-btn-lg"
            disabled={selected === null}
            onClick={check}
          >
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
