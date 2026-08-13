"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingEvaluation, SpeakingScenarioId } from "@/topik/types";
import { SPEAKING_SCENARIOS } from "@/topik/lib/speaking/prompts";
import { vi } from "@/topik/lib/i18n/vi";

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: { [index: number]: { transcript: string } | undefined } | undefined;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function SpeakingPracticeClient() {
  const [scenarioId, setScenarioId] = useState<SpeakingScenarioId>("self-intro");
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpeakingEvaluation | null>(null);
  const [speechOk, setSpeechOk] = useState(true);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const scenario = SPEAKING_SCENARIOS.find((s) => s.id === scenarioId)!;

  useEffect(() => {
    setSpeechOk(!!getSpeechRecognition());
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setSpeechOk(false);
      return;
    }
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) {
        text += ev.results[i]?.[0]?.transcript ?? "";
      }
      setTranscript(text.trim());
    };
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transcript.trim()) return;
    stopRecording();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/topik/api/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId, transcript: transcript.trim() }),
      });
      if (!res.ok) throw new Error("FAILED");
      setResult(await res.json());
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4 learn-animate-in">
        <div className="grid grid-cols-2 gap-3">
          <ScoreBox label={vi.speaking.pronunciation} value={result.pronunciationScore} />
          <ScoreBox label={vi.speaking.grammar} value={result.grammarScore} />
          <ScoreBox label={vi.speaking.fluency} value={result.fluencyScore} />
          <ScoreBox label={vi.speaking.overall} value={result.overallScore} highlight />
        </div>

        <div className="topik-card p-4">
          <p className="text-xs font-bold text-learn-ink-muted mb-2">{vi.speaking.feedback}</p>
          <p className="text-sm text-learn-ink leading-relaxed">{result.feedbackVi}</p>
        </div>

        {result.vietnameseErrors.some((e) => e.detected) && (
          <div className="topik-card p-4">
            <p className="text-xs font-bold text-learn-ink-muted mb-2">{vi.speaking.vietnameseErrors}</p>
            <ul className="space-y-2">
              {result.vietnameseErrors
                .filter((e) => e.detected)
                .map((e) => (
                  <li key={e.pattern} className="text-xs">
                    <p className="font-semibold text-orange-800">{e.explanationVi}</p>
                    <p className="text-learn-ink-muted mt-0.5">{e.tipVi}</p>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="topik-card p-4">
          <p className="text-xs font-bold text-learn-ink-muted mb-1">{vi.speaking.improved}</p>
          <p className="text-sm font-medium text-learn-ink">{result.improvedAnswerKo}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setTranscript("");
          }}
          className="w-full rounded-2xl bg-learn-primary py-3 text-sm font-bold text-white"
        >
          {vi.speaking.tryAgain}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 learn-animate-in">
      <div>
        <p className="text-xs font-bold text-learn-ink-muted mb-2">{vi.speaking.selectScenario}</p>
        <div className="flex flex-wrap gap-2">
          {SPEAKING_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setScenarioId(s.id);
                setTranscript("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
                scenarioId === s.id
                  ? "bg-learn-primary text-white border-learn-primary"
                  : "border-learn-border text-learn-ink-muted"
              }`}
            >
              {s.titleVi}
            </button>
          ))}
        </div>
      </div>

      <div className="topik-card p-4">
        <p className="text-xs font-bold text-learn-ink-muted">{vi.speaking.prompt}</p>
        <p className="mt-1 text-sm font-medium text-learn-ink">{scenario.promptKo}</p>
        <p className="mt-1 text-xs text-learn-ink-muted">{scenario.promptVi}</p>
        <p className="mt-3 text-xs font-bold text-learn-ink-muted">{vi.speaking.hints}</p>
        <ul className="mt-1 space-y-0.5">
          {scenario.hintsVi.map((h) => (
            <li key={h} className="text-xs text-learn-ink-muted">• {h}</li>
          ))}
        </ul>
      </div>

      <div>
        <label className="text-xs font-bold text-learn-ink-muted">{vi.speaking.yourAnswer}</label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          className="mt-1 w-full rounded-2xl border border-learn-border px-4 py-3 text-sm"
          placeholder={scenario.sampleAnswerKo}
        />
        {!speechOk && (
          <p className="mt-1 text-xs text-orange-600">{vi.speaking.speechUnsupported}</p>
        )}
        {speechOk && (
          <div className="mt-2 flex gap-2">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="rounded-xl border border-learn-primary px-4 py-2 text-xs font-bold text-learn-primary"
              >
                🎤 {vi.speaking.record}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white animate-pulse"
              >
                ⏹ {vi.speaking.stop}
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !transcript.trim()}
        className="w-full rounded-2xl bg-learn-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? vi.speaking.submitting : vi.speaking.submit}
      </button>
    </form>
  );
}

function ScoreBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`topik-card p-3 text-center ${highlight ? "ring-2 ring-learn-primary" : ""}`}>
      <p className="text-[10px] font-bold uppercase text-learn-ink-muted">{label}</p>
      <p className="text-2xl font-black text-learn-primary">{value}</p>
    </div>
  );
}
