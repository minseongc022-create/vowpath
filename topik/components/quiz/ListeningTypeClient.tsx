"use client";

import { useCallback, useEffect, useState } from "react";
import { useTopikLocale } from "@/topik/components/i18n/TopikLocaleProvider";
import { QuizLevelBadge, QuizSessionShell } from "@/topik/components/quiz/QuizSessionShell";
import {
  checkListeningAnswer,
  getListeningDrills,
  type ListeningDrill,
} from "@/topik/lib/drills/listening";
import { IconKeyboard, IconMic, IconSpeaker } from "@/topik/components/ui/TopikIcons";

function speakKorean(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export function ListeningTypeClient() {
  const { t } = useTopikLocale();
  const drills = getListeningDrills(5);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [keyboardMode, setKeyboardMode] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
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
      const t = setTimeout(() => play(), 400);
      return () => clearTimeout(t);
    }
  }, [drill, play]);

  function check() {
    if (!drill) return;
    const ok = checkListeningAnswer(answer, drill);
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
    setPlaysLeft(3);
  }

  if (done) {
    return (
      <QuizSessionShell current={drills.length} total={drills.length} backHref="/topik/listening">
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
    <QuizSessionShell
      current={idx}
      total={drills.length}
      backHref="/topik/listening"
      footer={
        <div className="topik-quiz-controls">
          <button type="button" className="topik-quiz-utility" onClick={play} disabled={playsLeft <= 0}>
            <IconSpeaker size={20} />
            <span>{t.quiz.listenAgain}</span>
            <span className="topik-play-dots">{playsLeft}</span>
          </button>
          <button type="button" className="topik-quiz-utility" onClick={() => setKeyboardMode((v) => !v)}>
            <IconKeyboard size={20} />
            <span>{t.quiz.keyboardMode}</span>
          </button>
        </div>
      }
    >
      <QuizLevelBadge level={drill.level} />

      <div className="topik-quiz-card topik-listening-card">
        <div className="topik-quiz-card-hint topik-listening-hint">
          <span className="topik-listening-wave" />
        </div>
        <div className="topik-quiz-card-body flex min-h-[120px] items-center justify-center">
          {keyboardMode ? (
            <input
              className="topik-input w-full border-0 bg-transparent text-center text-lg"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t.quiz.typeAnswer}
              disabled={showResult}
            />
          ) : (
            <button type="button" className="topik-mic-btn" aria-label="Speak answer">
              <IconMic size={28} />
            </button>
          )}
        </div>
      </div>

      {showResult && (
        <p className={`topik-quiz-feedback ${correct ? "topik-quiz-feedback-ok" : "topik-quiz-feedback-bad"}`}>
          {correct ? t.quiz.correct : t.quiz.wrong}
          {!correct && <span className="mt-1 block text-sm">{drill.audioText}</span>}
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
