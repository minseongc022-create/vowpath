"use client";

import { useEffect, useState } from "react";
import type { WrongRecord } from "@/topik/lib/store/file-store";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle, IconInbox } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";

export function WrongNotesClient({ initial }: { initial: WrongRecord[] }) {
  const [items, setItems] = useState(initial);
  const [inDrill, setInDrill] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const current = items[idx];

  useEffect(() => {
    if (inDrill && !finished && items.length > 0) {
      setFocusProgress(`${idx + 1}/${items.length}`);
    }
  }, [inDrill, finished, idx, items.length, setFocusProgress]);

  async function resolve(id: string) {
    await fetch("/topik/api/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-wrong", id }),
    });
    setItems((prev) => prev.filter((w) => w.id !== id));
  }

  function startDrill() {
    if (items.length === 0) return;
    enterFocus({
      title: vi.wrongNotes.title,
      subtitle: vi.wrongNotes.drillProgress,
      exitHref: "/topik/wrong-notes",
    });
    setInDrill(true);
    setIdx(0);
    setFinished(false);
    resetAnswer();
  }

  function resetAnswer() {
    setSelected(null);
    setShowResult(false);
    setCorrect(null);
  }

  function handleSubmit() {
    if (!current || current.correctIndex === undefined) return;
    const isCorrect = selected === current.correctIndex;
    setCorrect(isCorrect);
    setShowResult(true);
  }

  async function handleNextAfterCorrect() {
    if (!current) return;
    await resolve(current.id);
    if (idx + 1 >= items.length) {
      setFinished(true);
      leaveFocus();
      return;
    }
    setIdx((i) => i + 1);
    resetAnswer();
  }

  if (inDrill && finished) {
    return (
      <div className="topik-card topik-card-pad text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
        <p className="topik-result-label">{vi.wrongNotes.drillDone}</p>
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
    return (
      <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
        <div className="topik-card topik-card-pad">
          <span className="topik-badge">
            {vi.wrongNotes.drillProgress} · {idx + 1}/{items.length}
          </span>
          <p className="topik-question-ko mt-3">
            <KoreanStudyText text={current.question} studyMode />
          </p>
          {current.questionVi && (
            <p className="topik-question-vi">{current.questionVi}</p>
          )}
        </div>

        {current.options && (
          <div className="topik-option-list">
            {current.options.map((opt, i) => (
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

        {showResult && (
          <div className={`topik-feedback ${correct ? "topik-feedback-ok" : "topik-feedback-no"}`}>
            <p className="topik-feedback-title">
              {correct ? `✓ ${vi.practice.correct}` : `✗ ${vi.practice.wrong}`}
            </p>
            <p className="topik-feedback-text">{current.explanationVi}</p>
          </div>
        )}

        {!showResult ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected === null}
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
            {idx + 1 >= items.length ? vi.wrongNotes.drillDone : vi.practice.next}
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
      <button type="button" onClick={startDrill} className="topik-btn topik-btn-accent topik-btn-lg w-full">
        {vi.wrongNotes.startDrill} ({items.length})
      </button>
      {items.map((w) => (
        <div key={w.id} className="topik-card p-4">
          <span className="topik-badge">TOPIK {w.level}</span>
          <p className="mt-2 text-sm font-semibold text-learn-ink">
            <KoreanStudyText text={w.question} studyMode />
          </p>
          {w.questionVi && (
            <p className="mt-1 text-xs text-learn-ink-muted">{w.questionVi}</p>
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
