"use client";

import { useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import { getGrammarDrills, type GrammarDrill } from "@/topik/lib/drills/grammar";
import { cn } from "@/learn/lib/utils";

export function GrammarBlocksClient() {
  const { locale, t } = useTopikLocale();
  const drills = getGrammarDrills(5);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>(() => drills[0]?.blocks ?? []);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const drill: GrammarDrill | undefined = drills[idx];
  const hint = locale === "vi" ? drill?.hintVi : drill?.hintEn;

  function tapWord(word: string, fromSelected: boolean) {
    if (showResult) return;
    if (fromSelected) {
      setSelected((s) => s.filter((w, i) => !(w === word && i === s.lastIndexOf(word))));
      setAvailable((a) => [...a, word]);
    } else {
      setAvailable((a) => {
        const i = a.indexOf(word);
        if (i === -1) return a;
        return [...a.slice(0, i), ...a.slice(i + 1)];
      });
      setSelected((s) => [...s, word]);
    }
  }

  function check() {
    if (!drill) return;
    const ok = selected.join(" ") === drill.answer.join(" ");
    setCorrect(ok);
    setShowResult(true);
    if (ok) setScore((s) => s + 1);
  }

  function resetDrill(nextDrill: GrammarDrill) {
    setSelected([]);
    setAvailable([...nextDrill.blocks]);
    setShowResult(false);
    setCorrect(null);
  }

  function next() {
    if (idx + 1 >= drills.length) {
      setDone(true);
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    resetDrill(drills[nextIdx]!);
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/grammar">
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
    <QuizSessionShell current={idx} total={drills.length} backHref="/topik/grammar">
      <QuizLevelBadge level={drill.level} isNew={drill.isNew} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-body text-center">
          <p className="text-xl font-bold text-learn-ink">{drill.promptKo}</p>
          <p className="mt-2 text-sm text-learn-ink-muted">{hint}</p>
          <p className="mt-4 text-xs text-learn-ink-subtle">{drill.instructionVi}</p>
          <div className="topik-word-line mt-4 min-h-[2.5rem] border-b-2 border-learn-border pb-2">
            {selected.length === 0 ? (
              <span className="text-sm text-learn-ink-subtle">{t.quiz.tapWords}</span>
            ) : (
              selected.map((w, i) => (
                <button
                  key={`${w}-${i}`}
                  type="button"
                  className="topik-word-chip topik-word-chip-selected"
                  onClick={() => tapWord(w, true)}
                >
                  {w}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="topik-word-grid">
        {available.map((w, i) => (
          <button
            key={`${w}-${i}`}
            type="button"
            className="topik-word-chip"
            onClick={() => tapWord(w, false)}
          >
            {w}
          </button>
        ))}
      </div>

      {showResult && (
        <p className={cn("topik-quiz-feedback", correct ? "topik-quiz-feedback-ok" : "topik-quiz-feedback-bad")}>
          {correct ? t.quiz.correct : t.quiz.wrong}
          {!correct && (
            <span className="mt-1 block text-sm">{drill.answer.join(" ")}</span>
          )}
        </p>
      )}

      <div className="topik-quiz-actions-row">
        <button
          type="button"
          className="topik-btn topik-btn-outline topik-btn-sm"
          onClick={() => {
            setShowResult(true);
            setCorrect(false);
          }}
        >
          {t.quiz.seeAnswer}
        </button>
        {!showResult ? (
          <button
            type="button"
            className="topik-btn topik-btn-primary flex-1"
            disabled={selected.length === 0}
            onClick={check}
          >
            {t.quiz.confirm}
          </button>
        ) : (
          <button type="button" className="topik-btn topik-btn-primary flex-1" onClick={next}>
            {idx + 1 >= drills.length ? t.quiz.finish : t.quiz.next}
          </button>
        )}
      </div>
    </QuizSessionShell>
  );
}
