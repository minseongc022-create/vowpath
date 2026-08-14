"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TopikLevel } from "@/topik/types";
import {
  calcTypingCpm,
  countKoreanChars,
  getTypingPrompts,
  IBT_TYPING_MIN_CPM,
  IBT_TYPING_TARGET_CPM,
  type TypingPrompt,
} from "@/topik/lib/typing/prompts";
import { vi } from "@/topik/lib/i18n/vi";
import { IconCheckCircle, IconKeyboard } from "@/topik/components/ui/TopikIcons";
import { KoreanStudyText } from "@/topik/components/korean/KoreanStudyText";
import { StudyModeHint } from "@/topik/components/korean/StudyModeHint";

type Phase = "setup" | "typing" | "result";

const KINDS = [
  { value: "", label: vi.typing.allKinds },
  { value: "phrase", label: vi.typing.phrase },
  { value: "sentence", label: vi.typing.sentence },
  { value: "essay", label: vi.typing.essay },
] as const;

export function TypingPracticeClient() {
  const [level, setLevel] = useState<TopikLevel>(3);
  const [kind, setKind] = useState<string>("");
  const [phase, setPhase] = useState<Phase>("setup");
  const [prompts, setPrompts] = useState<TypingPrompt[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [results, setResults] = useState<{ cpm: number; accuracy: number }[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const current = prompts[idx];

  const startSession = useCallback(() => {
    const list = getTypingPrompts(level, kind ? (kind as TypingPrompt["kind"]) : undefined).slice(0, 5);
    setPrompts(list.length > 0 ? list : getTypingPrompts(level).slice(0, 5));
    setIdx(0);
    setInput("");
    setResults([]);
    setStartedAt(null);
    setPhase("typing");
  }, [level, kind]);

  useEffect(() => {
    if (phase === "typing") {
      inputRef.current?.focus();
    }
  }, [phase, idx]);

  function onInputChange(value: string) {
    if (!startedAt) setStartedAt(Date.now());
    setInput(value);
  }

  function calcAccuracy(target: string, typed: string): number {
    const t = target.replace(/\s/g, "");
    const y = typed.replace(/\s/g, "");
    if (t.length === 0) return 100;
    let match = 0;
    for (let i = 0; i < Math.min(t.length, y.length); i++) {
      if (t[i] === y[i]) match++;
    }
    return Math.round((match / t.length) * 100);
  }

  async function finishPrompt() {
    if (!current || !startedAt) return;
    const durationSec = Math.max(1, (Date.now() - startedAt) / 1000);
    const chars = countKoreanChars(input);
    const cpm = calcTypingCpm(chars, durationSec);
    const accuracy = calcAccuracy(current.korean, input);
    const nextResults = [...results, { cpm, accuracy }];
    setResults(nextResults);

    if (idx + 1 >= prompts.length) {
      const avgCpm = Math.round(nextResults.reduce((s, r) => s + r.cpm, 0) / nextResults.length);
      const avgAcc = Math.round(nextResults.reduce((s, r) => s + r.accuracy, 0) / nextResults.length);
      await fetch("/topik/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpm: avgCpm, accuracy: avgAcc, count: nextResults.length }),
      });
      setPhase("result");
      return;
    }

    setIdx((i) => i + 1);
    setInput("");
    setStartedAt(null);
  }

  const targetChars = current ? countKoreanChars(current.korean) : 0;
  const typedChars = countKoreanChars(input);
  const liveCpm =
    startedAt && typedChars > 0
      ? calcTypingCpm(typedChars, Math.max(1, (Date.now() - startedAt) / 1000))
      : 0;

  if (phase === "setup") {
    return (
      <div className="topik-quiz-shell topik-animate-in">
        <div className="topik-card topik-card-pad text-center">
          <IconKeyboard className="mx-auto text-learn-primary" size={48} />
          <p className="topik-page-subtitle mt-3">{vi.typing.subtitle}</p>
          <ul className="topik-setup-list text-left mt-4">
            <li>{vi.typing.intro1}</li>
            <li>{vi.typing.intro2}</li>
            <li>{vi.typing.intro3}</li>
            <li>{vi.typing.intro4}</li>
          </ul>
        </div>
        <label className="topik-field-label">{vi.typing.level}</label>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value) as TopikLevel)}
          className="topik-select"
        >
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <option key={l} value={l}>
              TOPIK {l}
            </option>
          ))}
        </select>
        <div className="topik-pill-row">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`topik-pill ${kind === k.value ? "topik-pill-active" : ""}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={startSession} className="topik-btn topik-btn-accent topik-btn-lg">
          {vi.typing.start}
        </button>
      </div>
    );
  }

  if (phase === "result") {
    const avgCpm = Math.round(results.reduce((s, r) => s + r.cpm, 0) / results.length);
    const avgAcc = Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length);
    const metTarget = avgCpm >= IBT_TYPING_MIN_CPM;

    return (
      <div className="topik-quiz-shell topik-animate-in text-center">
        <div className="topik-card topik-card-pad">
          <IconCheckCircle className="mx-auto text-learn-primary" size={52} />
          <p className="topik-result-label">{vi.typing.result}</p>
          <p className="topik-result-score">{avgCpm}</p>
          <p className="topik-result-hint">{vi.typing.cpmLabel}</p>
          <p className={`topik-char-count mt-2 ${metTarget ? "topik-char-count-ok" : "topik-char-count-warn"}`}>
            {metTarget ? vi.typing.targetMet : vi.typing.targetMiss}
          </p>
          <p className="topik-result-hint mt-2">
            {vi.typing.accuracy}: {avgAcc}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPhase("setup")}
          className="topik-btn topik-btn-primary topik-btn-lg"
        >
          {vi.common.retry}
        </button>
      </div>
    );
  }

  if (!current) return null;

  const progress = Math.min(100, Math.round((typedChars / targetChars) * 100));

  return (
    <div className="topik-quiz-shell topik-animate-in">
      <StudyModeHint />
      <div className="topik-exam-bar">
        <span className="topik-exam-section">{vi.typing.prompt} {idx + 1}/{prompts.length}</span>
        <span className={`topik-exam-timer ${liveCpm >= IBT_TYPING_MIN_CPM ? "" : "topik-exam-timer-warn"}`}>
          {liveCpm} {vi.typing.cpmShort}
        </span>
      </div>

      <div className="topik-card topik-card-pad">
        <span className="topik-badge">{current.kind === "essay" ? "IBT Q53" : current.kind}</span>
        <p className="topik-passage font-ko mt-3">
          <KoreanStudyText text={current.korean} studyMode />
        </p>
        <p className="topik-question-vi mt-2">{current.hintVi}</p>
        <p className="topik-char-count mt-2">
          {typedChars} / {targetChars} {vi.typing.chars}
        </p>
        <div className="topik-progress-bar mt-2">
          <div className="topik-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        rows={current.kind === "essay" ? 6 : 3}
        placeholder="여기에 한국어로 입력하세요…"
        className="topik-textarea font-ko"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
      />

      <button
        type="button"
        onClick={() => void finishPrompt()}
        disabled={typedChars < 1}
        className="topik-btn topik-btn-primary topik-btn-lg"
      >
        {idx + 1 >= prompts.length ? vi.typing.finish : vi.typing.next}
      </button>
    </div>
  );
}
