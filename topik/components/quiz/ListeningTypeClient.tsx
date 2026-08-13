"use client";

import { useCallback, useEffect, useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import {
  checkDictation,
  getListeningDrills,
  speakKorean,
  type ListeningDrill,
} from "@/topik/lib/drills/listening";
import { cn } from "@/learn/lib/utils";
import { IconSpeaker } from "@/topik/components/ui/TopikIcons";

export function ListeningTypeClient() {
  const { t } = useTopikLocale();
  const drills = getListeningDrills(5);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const drill: ListeningDrill | undefined = drills[idx];

  const play = useCallback(() => {
    if (!drill || playsLeft <= 0) return;
    speakKorean(drill.audioText);
    setPlaysLeft((p) => p - 1);
  }, [drill, playsLeft]);

  useEffect(() => {
    if (drill) {
      const timer = setTimeout(() => play(), 500);
      return () => clearTimeout(timer);
    }
  }, [drill, play]);

  function check() {
    if (!drill) return;
    let ok = false;
    if (drill.type === "dictation") {
      ok = checkDictation(answer, drill.acceptedAnswers);
    } else {
      ok = selected === drill.correctIndex;
    }
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
    setSelected(null);
    setShowResult(false);
    setPlaysLeft(3);
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/listening">
        <div className="topik-quiz-done">
          <p className="text-lg font-bold">{t.quiz.finish}</p>
          <p className="mt-2 text-learn-ink-muted">{score}/{drills.length}</p>
        </div>
      </QuizSessionShell>
    );
  }

  if (!drill) return null;

  return (
    <QuizSessionShell current={idx} total={drills.length} backHref="/topik/listening">
      <QuizLevelBadge level={drill.level} />

      <div className="topik-quiz-card">
        <div className="topik-quiz-card-hint">{drill.hintVi}</div>
        <div className="topik-quiz-card-body flex flex-col items-center gap-3 py-6">
          <button type="button" className="topik-btn topik-btn-outline topik-btn-sm" onClick={play} disabled={playsLeft <= 0}>
            <IconSpeaker size={18} />
            {t.quiz.listenAgain} ({playsLeft})
          </button>
          {drill.type === "minimal_pair" && (
            <span className="topik-badge">Phân biệt âm</span>
          )}
        </div>
      </div>

      {drill.type === "dictation" ? (
        <input
          className="topik-input font-ko mt-4 text-center text-lg"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={t.quiz.placeholder}
          disabled={showResult}
          onKeyDown={(e) => e.key === "Enter" && !showResult && answer.trim() && check()}
        />
      ) : (
        <div className="topik-option-list mt-4">
          {drill.options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              disabled={showResult}
              className={cn(
                "topik-option font-ko",
                selected === i && !showResult && "topik-option-selected",
                showResult && i === drill.correctIndex && "topik-option-correct",
                showResult && selected === i && i !== drill.correctIndex && "topik-option-wrong",
              )}
              onClick={() => setSelected(i)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {showResult && (
        <>
          <p className={`topik-quiz-feedback ${correct ? "topik-quiz-feedback-ok" : "topik-quiz-feedback-bad"}`}>
            {correct ? t.quiz.correct : t.quiz.wrong}
            {!correct && drill.type === "dictation" && (
              <span className="mt-1 block font-ko text-sm">{drill.audioText}</span>
            )}
          </p>
          {drill.type === "minimal_pair" && (
            <p className="topik-vn-tip">{drill.pairNoteVi}</p>
          )}
        </>
      )}

      <div className="topik-quiz-actions">
        {!showResult ? (
          <button
            type="button"
            className="topik-btn topik-btn-primary topik-btn-lg"
            onClick={check}
            disabled={drill.type === "dictation" ? !answer.trim() : selected === null}
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
