"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllDictionaryEntries, getDisplayMeaning, getDisplayExample, type DictEntry } from "@/topik/lib/korean/dictionary";
import { speakKorean } from "@/topik/lib/korean/tts";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { useTopikFocus } from "@/topik/components/focus/TopikFocusProvider";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";
import { IconCheckCircle, IconSpeaker } from "@/topik/components/ui/TopikIcons";

export function VocabDrillClient() {
  const vi = useTopikVi();

  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [known, setKnown] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const { enterFocus, leaveFocus, setFocusProgress } = useTopikFocus();

  const load = useCallback(() => {
    const all = getAllDictionaryEntries();
    const shuffled = [...all].sort(() => Math.random() - 0.5).slice(0, 20);
    setEntries(shuffled);
    setIdx(0);
    setShowAnswer(false);
    setKnown(0);
    setFinished(false);
    setStarted(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (started && !finished && entries.length > 0) {
      setFocusProgress(`${idx + 1}/${entries.length}`);
    }
  }, [started, finished, idx, entries.length, setFocusProgress]);

  useEffect(() => {
    if (finished) leaveFocus();
  }, [finished, leaveFocus]);

  function beginDrill() {
    enterFocus({ title: vi.vocab.title, exitHref: "/topik/vocab" });
    setStarted(true);
  }

  async function handleKnown(knew: boolean) {
    if (knew) setKnown((k) => k + 1);
    if (idx + 1 >= entries.length) {
      await fetch("/topik/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete-vocab" }),
      });
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setShowAnswer(false);
  }

  if (entries.length === 0) {
    return <p className="topik-loading">{vi.common.loading}</p>;
  }

  if (finished) {
    return (
      <div className="topik-card topik-card-pad text-center topik-animate-in">
        <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
        <p className="topik-result-label">{vi.vocab.sessionDone}</p>
        <p className="topik-result-score">
          {known} / {entries.length}
        </p>
        <button type="button" onClick={load} className="topik-btn topik-btn-primary topik-btn-lg mt-4">
          {vi.common.retry}
        </button>
      </div>
    );
  }

  const current = entries[idx];

  if (!current) return null;

  if (!started && entries.length > 0) {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad text-center">
          <p className="topik-page-subtitle">{vi.vocab.subtitle}</p>
          <p className="topik-result-hint mt-2">20 {vi.review.cardsReviewed}</p>
        </div>
        <button type="button" onClick={beginDrill} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.practice.start}
        </button>
      </div>
    );
  }

  return (
    <div className="topik-quiz-shell topik-quiz-shell--focus topik-animate-in">
      <p className="topik-study-hint">{vi.korean.tapHint}</p>
      <div className="topik-card topik-card-pad text-center">
        <span className="topik-badge">
          {idx + 1} / {entries.length}
        </span>
        <p className="topik-vocab-front font-ko mt-4">
          <KoreanStudyText text={current.korean} studyMode />
        </p>
        <button
          type="button"
          onClick={() => void speakKorean(current.korean)}
          className="topik-btn topik-btn-outline topik-btn-sm mt-3 mx-auto"
        >
          <IconSpeaker size={16} />
          {vi.korean.listenAgain}
        </button>

        {showAnswer ? (
          <div className="mt-4">
            <p className="text-xl font-bold text-learn-primary">
              {getDisplayMeaning(current, vi.korean.noDefinition)}
            </p>
            {current.example && (
              <p className="mt-2 text-sm text-learn-ink-muted">
                <KoreanStudyText text={current.example} studyMode />
              </p>
            )}
            {getDisplayExample(current) && (
              <p className="mt-1 text-sm font-semibold text-learn-primary">
                {getDisplayExample(current)}
              </p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="topik-btn topik-btn-primary topik-btn-lg mt-6"
          >
            {vi.review.showAnswer}
          </button>
        )}
      </div>

      {showAnswer && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void handleKnown(false)} className="topik-btn topik-btn-outline topik-btn-lg">
            {vi.review.again}
          </button>
          <button type="button" onClick={() => void handleKnown(true)} className="topik-btn topik-btn-accent topik-btn-lg">
            {vi.review.good}
          </button>
        </div>
      )}
    </div>
  );
}
