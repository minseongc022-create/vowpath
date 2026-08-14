"use client";

import { useEffect, useMemo, useState } from "react";
import type { WrongRecord } from "@/topik/lib/store/file-store";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconCheckCircle, IconInbox } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { QuizProgressBar } from "@/topik/components/quiz/QuizProgressBar";

function isDrillable(item: WrongRecord): boolean {
  return item.options !== undefined && item.correctIndex !== undefined;
}

export function WrongNotesClient({ initial }: { initial: WrongRecord[] }) {
  const vi = useTopikVi();

  const [items, setItems] = useState(initial);
  const [inDrill, setInDrill] = useState(false);
  const [drillItems, setDrillItems] = useState<WrongRecord[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const drillable = useMemo(() => items.filter(isDrillable), [items]);
  const current = drillItems[idx];

  useEffect(() => {
    if (inDrill && !finished && drillItems.length > 0) {
      setFocusProgress(`${idx + 1}/${drillItems.length}`);
    }
  }, [inDrill, finished, idx, drillItems.length, setFocusProgress]);

  async function resolve(id: string) {
    await fetch("/topik/api/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-wrong", id }),
    });
    setItems((prev) => prev.filter((w) => w.id !== id));
    setDrillItems((prev) => prev.filter((w) => w.id !== id));
  }

  function startDrill() {
    if (drillable.length === 0) return;
    enterFocus({
      title: vi.wrongNotes.title,
      subtitle: vi.wrongNotes.drillProgress,
      exitHref: "/topik/wrong-notes",
    });
    setDrillItems([...drillable]);
    setInDrill(true);
    setIdx(0);
    setResolvedCount(0);
    setFinished(false);
    resetAnswer();
  }

  function resetAnswer() {
    setSelected(null);
    setTextAnswer("");
    setShowResult(false);
    setCorrect(null);
    setAttempts(0);
  }

  function checkCurrentAnswer(): boolean {
    if (!current) return false;
    if (current.correctIndex !== undefined && current.options) {
      return selected === current.correctIndex;
    }
    if (current.correctAnswer) {
      const normalized = textAnswer.trim().toLowerCase();
      const expected = current.correctAnswer.trim().toLowerCase();
      return normalized === expected || normalized.includes(expected);
    }
    return false;
  }

  function handleSubmit() {
    if (!current) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = checkCurrentAnswer();
    setCorrect(isCorrect);
    setShowResult(true);
  }

  async function handleNextAfterCorrect() {
    if (!current) return;
    await resolve(current.id);
    setResolvedCount((n) => n + 1);
    if (idx + 1 >= drillItems.length) {
      setFinished(true);
      leaveFocus();
      await fetch("/topik/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-practice" }),
      });
      return;
    }
    setIdx((i) => i + 1);
    resetAnswer();
  }

  const correctLabel = current ? getCorrectAnswerTextFromWrong(current) : null;

  if (inDrill && finished) {
    return (
      <div className="topik-card topik-card-pad text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
        <p className="topik-result-label">{vi.wrongNotes.drillDone}</p>
        <p className="topik-result-hint">
          {resolvedCount} / {drillItems.length}
        </p>
        <button
          type="button"
          onClick={() => {
            setInDrill(false);
            setFinished(false);
          }}
          className="topik-btn topik-btn-primary topik-btn-lg mt-4"
        >
          {vi.common.back}
        </button>
      </div>
    );
  }

  if (inDrill && current) {
    const hasMc = current.options && current.correctIndex !== undefined;

    return (
      <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
        <QuizProgressBar current={idx + 1} total={drillItems.length} />
        <div className="topik-card topik-card-pad">
          <span className="topik-badge">
            {vi.wrongNotes.drillProgress} · {idx + 1}/{drillItems.length}
          </span>
          <p className="topik-question-ko mt-3">
            <KoreanStudyText text={current.question} studyMode />
          </p>
          {current.questionVi && (
            <p className="topik-question-vi">{current.questionVi}</p>
          )}
        </div>

        {hasMc && (
          <div className="topik-option-list">
            {current.options!.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={showResult}
                onClick={() => setSelected(i)}
                className={`topik-option ${
                  showResult && i === current.correctIndex
                    ? "topik-option-correct"
                    : showResult && i === selected && i !== current.correctIndex
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

        {!hasMc && current.correctAnswer && (
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
            {attempts > 1 && !correct && (
              <p className="topik-feedback-attempts">
                {vi.quiz.attemptCount.replace("{n}", String(attempts))}
              </p>
            )}
            {!correct && selected !== null && current.options && (
              <p className="topik-feedback-your-answer">
                {vi.wrongNotes.yourAnswer}: {current.options[selected]}
              </p>
            )}
            {!correct && correctLabel && (
              <div className="topik-feedback-answer">
                <p className="topik-feedback-answer-label">{vi.quiz.correctAnswer}</p>
                <p className="topik-feedback-answer-text">{correctLabel}</p>
              </div>
            )}
            <p className="topik-feedback-text">{current.explanationVi}</p>
          </div>
        )}

        {!showResult ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={hasMc ? selected === null : !textAnswer.trim()}
            className="topik-btn topik-btn-primary topik-btn-lg"
          >
            {vi.practice.submit}
          </button>
        ) : correct ? (
          <button
            type="button"
            onClick={() => void handleNextAfterCorrect()}
            className="topik-btn topik-btn-primary topik-btn-lg"
          >
            {idx + 1 >= drillItems.length ? vi.wrongNotes.drillDone : vi.practice.next}
          </button>
        ) : (
          <button type="button" onClick={resetAnswer} className="topik-btn topik-btn-accent topik-btn-lg">
            {vi.practice.tryAgain}
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="topik-empty-state topik-card p-8 text-center">
        <IconInbox className="mx-auto text-learn-ink-subtle" />
        <p className="mt-3 text-sm text-learn-ink-muted">{vi.wrongNotes.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <StudyModeHint />
      {drillable.length > 0 ? (
        <button type="button" onClick={startDrill} className="topik-btn topik-btn-accent topik-btn-lg w-full">
          {vi.wrongNotes.startDrill} ({drillable.length})
        </button>
      ) : (
        <p className="topik-drill-preview-warn text-sm">{vi.wrongNotes.drillOnlyMc}</p>
      )}
      {items.map((w) => (
        <div key={w.id} className="topik-card p-4">
          <span className="topik-badge">TOPIK {w.level}</span>
          <p className="mt-2 text-sm font-semibold text-learn-ink">
            <KoreanStudyText text={w.question} studyMode />
          </p>
          {w.questionVi && (
            <p className="mt-1 text-xs text-learn-ink-muted">{w.questionVi}</p>
          )}
          {w.options && w.correctIndex !== undefined && (
            <p className="mt-2 text-xs text-learn-ink-muted">
              {vi.quiz.correctAnswer}: {w.options[w.correctIndex]}
            </p>
          )}
          {w.correctAnswer && !w.options && (
            <p className="mt-2 text-xs text-learn-ink-muted">
              {vi.quiz.correctAnswer}: {w.correctAnswer}
            </p>
          )}
          <p className="mt-1 text-xs text-learn-ink-muted">{w.explanationVi}</p>
          <button
            type="button"
            onClick={() => void resolve(w.id)}
            className="mt-3 text-xs font-bold text-learn-primary"
          >
            ✓ {vi.wrongNotes.resolved}
          </button>
        </div>
      ))}
    </div>
  );
}

function getCorrectAnswerTextFromWrong(w: WrongRecord): string | null {
  if (w.options && w.correctIndex !== undefined) {
    return w.options[w.correctIndex] ?? null;
  }
  return w.correctAnswer ?? null;
}
