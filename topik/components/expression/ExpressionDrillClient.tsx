"use client";

import { useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import { getExpressionDrills, type ExpressionDrill } from "@/topik/lib/drills/expression";
import { cn } from "@/learn/lib/utils";

export function ExpressionDrillClient() {
  const { locale, t } = useTopikLocale();
  const drills = getExpressionDrills(5);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const drill: ExpressionDrill | undefined = drills[idx];
  const hint = locale === "vi" ? drill?.hintVi : drill?.hintEn;

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
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/expression">
        <div className="topik-quiz-done">
          <p className="text-xl font-bold">{t.quiz.finish}</p>
          <p className="mt-2 text-learn-ink-muted">
            {score}/{drills.length}
          </p>
        </div>
      </QuizSessionShell>
    );
  }

  if (!drill) return null;

  return (
    <QuizSessionShell current={idx} total={drills.length} backHref="/topik/expression">
      <QuizLevelBadge level={drill.level} isNew={drill.isNew} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-hint">{hint}</div>
        <div className="topik-quiz-card-body text-center">
          <p className="text-sm text-learn-ink-muted">{drill.context}</p>
          <p className="mt-3 text-xl font-bold text-learn-ink">{drill.meaningVi}</p>
          <p className="mt-2 text-xs text-learn-ink-subtle">Chọn biểu đạt tiếng Hàn phù hợp</p>
        </div>
      </div>

      <div className="topik-option-list">
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
                "topik-option",
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
