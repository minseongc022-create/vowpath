"use client";

import { useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import { getGrammarDrills, type GrammarDrill } from "@/topik/lib/drills/grammar";
import { cn } from "@/learn/lib/utils";

export function GrammarBlocksClient() {
  const { locale, t } = useTopikLocale();
  const drills = getGrammarDrills(6);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const drill: GrammarDrill | undefined = drills[idx];
  const instruction = locale === "vi" ? drill?.instructionVi : drill?.instructionEn;

  function renderSentence(particle?: string) {
    if (!drill) return null;
    const parts = drill.sentenceTemplate.split("___");
    return (
      <p className="topik-ko-display font-ko text-xl">
        {parts[0]}
        <span className={particle ? "text-learn-primary" : "text-learn-ink-subtle underline decoration-dotted"}>
          {particle ?? "___"}
        </span>
        {parts[1] ?? ""}
      </p>
    );
  }

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
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/grammar">
        <div className="topik-quiz-done">
          <p className="text-lg font-bold">{t.quiz.finish}</p>
          <p className="mt-2 text-learn-ink-muted">{score}/{drills.length}</p>
        </div>
      </QuizSessionShell>
    );
  }

  if (!drill) return null;

  const correctParticle = drill.options[drill.correctIndex];

  return (
    <QuizSessionShell current={idx} total={drills.length} backHref="/topik/grammar">
      <QuizLevelBadge level={drill.level} isNew={drill.isNew} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-body text-center">
          <p className="text-sm text-learn-ink-muted mb-4">{instruction}</p>
          {renderSentence(showResult ? correctParticle : undefined)}
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
                "topik-option font-ko text-center",
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

      {showResult && (
        <p className="topik-vn-tip">{drill.explanationVi}</p>
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
