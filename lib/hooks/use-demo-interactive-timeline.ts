"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DemoTransition,
  InteractiveStep,
} from "@/lib/demo-interactive-script";
import { demoAudioPlayer, speakDemoFallback } from "@/lib/demo-audio-player";
import { isDemoAudioUnlocked, unlockDemoAudio } from "@/lib/demo-audio-unlock";

type UseDemoInteractiveTimelineOptions = {
  steps: InteractiveStep[];
  audioPrefix?: string;
  enabled?: boolean;
};

const TRANSITION_COPY: Record<DemoTransition, string> = {
  "retell-connect": "Connecting to AI receptionist…",
  soft: "AI is listening…",
  sms: "Sending text…",
};

export function useDemoInteractiveTimeline({
  steps,
  audioPrefix,
  enabled = true,
}: UseDemoInteractiveTimelineOptions) {
  const [cursor, setCursor] = useState(0);
  const [customerLines, setCustomerLines] = useState<string[]>([]);
  const [aiLine, setAiLine] = useState<string | null>(null);
  const [systemLine, setSystemLine] = useState<string | null>(null);
  const [ownerSms, setOwnerSms] = useState<string | null>(null);
  const [crewSms, setCrewSms] = useState<string | null>(null);
  const [fyiSms, setFyiSms] = useState<string | null>(null);
  const [customerSms, setCustomerSms] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transitionKind, setTransitionKind] = useState<DemoTransition | null>(null);
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [done, setDone] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(() => isDemoAudioUnlocked());
  const audioUnlockedRef = useRef(audioUnlocked);
  const customerScrollRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    runningRef.current = false;
    setCursor(0);
    setCustomerLines([]);
    setAiLine(null);
    setSystemLine(null);
    setOwnerSms(null);
    setCrewSms(null);
    setFyiSms(null);
    setCustomerSms(null);
    setSpeaking(false);
    setTransferring(false);
    setTransitionKind(null);
    setWaitingForClick(false);
    setDone(false);
  }, []);

  const markUnlocked = useCallback(() => {
    unlockDemoAudio();
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
  }, []);

  const advanceWithTransition = useCallback(
    async (
      nextCursor: number | ((c: number) => number),
      kind: DemoTransition = "soft",
    ) => {
      setWaitingForClick(false);
      setTransferring(true);
      setTransitionKind(kind);
      setSpeaking(false);

      if (kind === "retell-connect") {
        setAiLine(null);
        if (audioUnlockedRef.current) {
          await demoAudioPlayer.ensureReady();
          await demoAudioPlayer.playTransferTone(1400);
        } else {
          await new Promise((r) => setTimeout(r, 900));
        }
      } else if (kind === "sms") {
        await new Promise((r) => setTimeout(r, 700));
      } else {
        // soft — AI thinking / listening beat (no fake transfer ring)
        await new Promise((r) => setTimeout(r, 450));
      }

      setTransferring(false);
      setTransitionKind(null);
      setCursor(nextCursor);
    },
    [],
  );

  const playAi = useCallback(
    async (text: string, audioIndex?: number, audioClip?: string) => {
      setAiLine(text);
      setSpeaking(true);

      if (audioUnlockedRef.current) {
        let played = false;
        if (audioClip) {
          played = await demoAudioPlayer.playMp3(`/demo-audio/${audioClip}`);
        } else if (audioPrefix && audioIndex !== undefined) {
          played = await demoAudioPlayer.playMp3(`/demo-audio/${audioPrefix}-${audioIndex}.mp3`);
        }
        if (!played) {
          await speakDemoFallback(text);
        }
      } else {
        await new Promise((r) => setTimeout(r, Math.max(text.length * 42, 1400)));
      }

      setSpeaking(false);
    },
    [audioPrefix],
  );

  const runAutoSteps = useCallback(
    async (fromIndex: number) => {
      if (runningRef.current) return;
      runningRef.current = true;
      let i = fromIndex;

      try {
        while (i < steps.length) {
          const step = steps[i];
          setCursor(i);
          setWaitingForClick(false);

          if (step.kind === "menu" || step.kind === "customer-action" || step.kind === "owner-action") {
            setWaitingForClick(true);
            return;
          }

          if (step.kind === "system") {
            setSystemLine(step.text);
            i += 1;
            await new Promise((r) => setTimeout(r, 350));
            continue;
          }

          if (step.kind === "ai-voice") {
            await playAi(step.text, step.audioIndex, step.audioClip);
            i += 1;
            continue;
          }

          if (step.kind === "sms") {
            if (step.variant === "crew") setCrewSms(step.text);
            else if (step.variant === "fyi") setFyiSms(step.text);
            else if (step.variant === "customer") setCustomerSms(step.text);
            else setOwnerSms(step.text);
            i += 1;
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        }

        setCursor(steps.length);
        setDone(true);
      } finally {
        runningRef.current = false;
      }
    },
    [playAi, steps],
  );

  useEffect(() => {
    if (!enabled) {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      return;
    }
    if (!audioUnlocked) return;
    if (waitingForClick || done || transferring) return;
    void runAutoSteps(cursor);
  }, [enabled, audioUnlocked, cursor, waitingForClick, done, transferring, runAutoSteps]);

  const advanceWithCustomer = useCallback(
    (text: string, transition: DemoTransition = "soft") => {
      markUnlocked();
      setCustomerLines((prev) => [...prev, text]);
      void advanceWithTransition((c) => c + 1, transition);
    },
    [markUnlocked, advanceWithTransition],
  );

  const handleMenuChoice = useCallback(
    (option: {
      customerText?: string;
      jumpTo?: number;
      transition?: DemoTransition;
    }) => {
      markUnlocked();
      if (option.customerText) {
        setCustomerLines((prev) => [...prev, option.customerText!]);
      }
      void advanceWithTransition(
        option.jumpTo !== undefined ? option.jumpTo : (c) => c + 1,
        option.transition ?? "retell-connect",
      );
    },
    [markUnlocked, advanceWithTransition],
  );

  const handleOwnerAction = useCallback(
    (systemText: string, transition: DemoTransition = "sms") => {
      markUnlocked();
      setSystemLine(systemText);
      void advanceWithTransition((c) => c + 1, transition);
    },
    [markUnlocked, advanceWithTransition],
  );

  const unlockAudio = useCallback(() => {
    markUnlocked();
    if (!runningRef.current && !done && !transferring) {
      void runAutoSteps(cursor);
    }
  }, [markUnlocked, runAutoSteps, cursor, done, transferring]);

  useEffect(() => {
    const el = customerScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [customerLines]);

  const currentStep = steps[cursor] ?? null;
  const transitionLabel = transitionKind ? TRANSITION_COPY[transitionKind] : null;

  return {
    customerLines,
    aiLine,
    systemLine,
    ownerSms,
    crewSms,
    fyiSms,
    customerSms,
    speaking,
    transferring,
    transitionKind,
    transitionLabel,
    waitingForClick,
    done,
    currentStep,
    customerScrollRef,
    advanceWithCustomer,
    handleMenuChoice,
    handleOwnerAction,
    unlockAudio,
    audioUnlocked,
    reset,
  };
}
