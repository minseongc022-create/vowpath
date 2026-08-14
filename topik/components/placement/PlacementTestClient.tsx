"use client";

import { useState } from "react";
import Link from "next/link";
import { PLACEMENT_TEST } from "@/topik/lib/quiz/placement-test";
import { estimateLevelFromPlacement } from "@/topik/lib/journey/study-journey";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle } from "@/topik/components/ui/TopikIcons";
import { quizQuestionText } from "@/topik/lib/i18n/content-locale";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";

type Phase = "intro" | "test" | "result";

export function PlacementTestClient() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [estimatedLevel, setEstimatedLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const q = PLACEMENT_TEST[idx];

  async function handleNext() {
    if (!q || selected === null) return;
    const isCorrect = selected === q.correctIndex;
    const nextCorrect = isCorrect ? correct + 1 : correct;

    if (idx + 1 >= PLACEMENT_TEST.length) {
      setLoading(true);
      const level = estimateLevelFromPlacement(nextCorrect, PLACEMENT_TEST.length);
      await fetch("/topik/api/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, correct: nextCorrect, total: PLACEMENT_TEST.length }),
      });
      setCorrect(nextCorrect);
      setEstimatedLevel(level);
      setPhase("result");
      setLoading(false);
      return;
    }

    setCorrect(nextCorrect);
    setIdx((i) => i + 1);
    setSelected(null);
  }

  if (phase === "intro") {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad">
          <p className="topik-page-subtitle">{vi.placement.subtitle}</p>
          <ul className="topik-setup-list">
            <li>{vi.placement.intro1}</li>
            <li>{vi.placement.intro2}</li>
            <li>{vi.placement.intro3}</li>
            <li>{vi.placement.intro4}</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setPhase("test")}
          className="topik-btn topik-btn-accent topik-btn-lg"
        >
          {vi.placement.start}
        </button>
      </div>
    );
  }

  if (phase === "result" && estimatedLevel !== null) {
    const pct = Math.round((correct / PLACEMENT_TEST.length) * 100);
    return (
      <div className="topik-quiz-shell topik-animate-in text-center">
        <div className="topik-card topik-card-pad">
          <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
          <p className="topik-result-label">{vi.placement.result}</p>
          <p className="topik-result-score">TOPIK {estimatedLevel}</p>
          <p className="topik-result-hint">
            {correct}/{PLACEMENT_TEST.length} ({pct}%) — {vi.placement.resultHint}
          </p>
        </div>
        <Link href="/topik" className="topik-btn topik-btn-primary topik-btn-lg">
          {vi.placement.backHome}
        </Link>
        <Link href={`/topik/practice?level=${estimatedLevel}`} className="topik-btn topik-btn-outline topik-btn-lg">
          {vi.placement.startPractice}
        </Link>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="topik-quiz-shell topik-animate-in">
      <p className="topik-exam-mode-banner" role="status">
        🔒 {vi.korean.examModeOff}
      </p>
      <div className="topik-exam-bar">
        <span className="topik-exam-progress">
          {vi.placement.question} {idx + 1}/{PLACEMENT_TEST.length}
        </span>
      </div>

      <div className="topik-card topik-card-pad">
        {q.listeningScript && (
          <div className="topik-script-box font-ko mb-3">
            <p className="topik-script-ko">
              <KoreanStudyText text={q.listeningScript} studyMode={false} />
            </p>
          </div>
        )}
        {q.passage && (
          <p className="topik-passage font-ko">
            <KoreanStudyText text={q.passage} studyMode={false} />
          </p>
        )}
        <p className="topik-question-vi">{quizQuestionText(q)}</p>
      </div>

      <div className="topik-option-list">
        {q.options?.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => setSelected(i)}
            className={`topik-option ${selected === i ? "topik-option-selected" : ""}`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleNext()}
        disabled={selected === null || loading}
        className="topik-btn topik-btn-primary topik-btn-lg"
      >
        {idx + 1 >= PLACEMENT_TEST.length ? vi.placement.finish : vi.placement.next}
      </button>
    </div>
  );
}
