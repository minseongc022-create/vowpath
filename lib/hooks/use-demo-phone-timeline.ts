"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhoneDemoPhase } from "@/lib/demo-phone-script";
import { demoAudioPlayer, demoSpeechPause } from "@/lib/demo-audio-player";

const CUSTOMER_TYPING_MS = 900;
const CUSTOMER_HOLD_MS = 3200;
const PHASE_TAIL_MS = 650;

type AiVoicePhase = Extract<PhoneDemoPhase, { kind: "ai-voice" }>;

type UseDemoPhoneTimelineOptions = {
  timeline: PhoneDemoPhase[];
  audioPrefix: string;
  recordMode: boolean;
  /** When false, pause timeline and audio (e.g. demo scrolled off-screen). */
  enabled?: boolean;
  loopDelayMs?: number;
  /** Return next step index when a phase should advance the stepper. */
  stepIdxForPhase?: (phase: PhoneDemoPhase) => number | null;
};

export function useDemoPhoneTimeline({
  timeline,
  audioPrefix,
  recordMode,
  enabled = true,
  loopDelayMs = 5000,
  stepIdxForPhase,
}: UseDemoPhoneTimelineOptions) {
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [ownerSms, setOwnerSms] = useState<string | null>(null);
  const [crewSms, setCrewSms] = useState<string | null>(null);
  const [fyiSms, setFyiSms] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [typing, setTyping] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runGenerationRef = useRef(0);
  const customerScrollRef = useRef<HTMLDivElement | null>(null);

  const stopLocalAudio = useCallback(() => {
    const prev = audioRef.current;
    if (!prev) return;
    prev.onended = null;
    prev.onerror = null;
    prev.pause();
    prev.currentTime = 0;
  }, []);

  const playAi = useCallback(
    async (phase: AiVoicePhase, runId: number) => {
      setAiLine(phase.text);
      setSpeaking(true);

      demoAudioPlayer.stop();
      stopLocalAudio();

      const audio = new Audio(`/demo-audio/${audioPrefix}-${phase.audioIndex}.mp3`);
      audioRef.current = audio;
      try {
        await audio.play();
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            if (runGenerationRef.current === runId) resolve();
          };
          audio.onerror = () => {
            if (runGenerationRef.current === runId) resolve();
          };
          setTimeout(() => {
            if (runGenerationRef.current === runId) resolve();
          }, Math.max(phase.text.length * 78, 3800));
        });
      } catch {
        if (runGenerationRef.current === runId) {
          await demoSpeechPause(phase.text);
        }
      } finally {
        if (runGenerationRef.current === runId) setSpeaking(false);
      }
    },
    [audioPrefix, stopLocalAudio],
  );

  const resetScene = useCallback(() => {
    setCustomerLines([]);
    setAiLine(null);
    setSystemLine(null);
    setOwnerSms(null);
    setCrewSms(null);
    setFyiSms(null);
    setSpeaking(false);
    setTyping(false);
    setStepIdx(0);
  }, []);

  const run = useCallback(() => {
    const runId = ++runGenerationRef.current;
    demoAudioPlayer.stop();
    stopLocalAudio();
    resetScene();

    const isStale = () => runGenerationRef.current !== runId;
    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const applyPhase = async (phase: PhoneDemoPhase) => {
      if (isStale()) return;
      await sleep(phase.delayMs);
      if (isStale()) return;

      if (phase.kind === "system") {
        setSystemLine(phase.text);
      }

      if (phase.kind === "sms") {
        if (phase.variant === "crew") setCrewSms(phase.text);
        else if (phase.variant === "fyi") setFyiSms(phase.text);
        else setOwnerSms(phase.text);
      }

      if (phase.kind === "customer-text") {
        setTyping(true);
        await sleep(CUSTOMER_TYPING_MS);
        if (isStale()) return;
        setTyping(false);
        setCustomerLines((prev) => [...prev, phase.text]);
        await sleep(CUSTOMER_HOLD_MS);
      }

      if (phase.kind === "ai-voice") {
        setStepIdx((s) => (s < 1 ? 1 : s));
        await playAi(phase, runId);
        if (isStale()) return;
        await sleep(PHASE_TAIL_MS);
      }

      const nextStep = stepIdxForPhase?.(phase);
      if (nextStep !== null && nextStep !== undefined) setStepIdx(nextStep);
    };

    void (async () => {
      for (;;) {
        for (const phase of timeline) {
          await applyPhase(phase);
          if (isStale()) return;
        }
        if (recordMode) return;
        await sleep(loopDelayMs);
        if (isStale()) return;
        resetScene();
      }
    })();
  }, [loopDelayMs, playAi, recordMode, resetScene, stepIdxForPhase, stopLocalAudio, timeline]);

  useEffect(() => {
    if (!enabled) {
      runGenerationRef.current += 1;
      demoAudioPlayer.stop();
      stopLocalAudio();
      return;
    }
    run();
    return () => {
      runGenerationRef.current += 1;
      demoAudioPlayer.stop();
      stopLocalAudio();
    };
  }, [run, enabled, stopLocalAudio]);

  useEffect(() => {
    const el = customerScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [customerLines, typing]);

  return {
    customerLines,
    aiLine,
    systemLine,
    ownerSms,
    crewSms,
    fyiSms,
    speaking,
    typing,
    stepIdx,
    customerScrollRef,
  };
}
