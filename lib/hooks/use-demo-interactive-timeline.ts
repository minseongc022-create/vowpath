"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InteractiveStep } from "@/lib/demo-interactive-script";
import { demoAudioPlayer, speakDemoFallback } from "@/lib/demo-audio-player";
import { isDemoAudioUnlocked, unlockDemoAudio } from "@/lib/demo-audio-unlock";

type UseDemoInteractiveTimelineOptions = {
  steps: InteractiveStep[];
  audioPrefix?: string;
  enabled?: boolean;
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
    setWaitingForClick(false);
    setDone(false);
  }, []);

  const markUnlocked = useCallback(() => {
    unlockDemoAudio();
    audioUnlockedRef.current = true;
    setAudioUnlocked(true);
  }, []);

  const playTransferThenAdvance = useCallback(async (nextCursor: number | ((c: number) => number)) => {
    setWaitingForClick(false);
    setTransferring(true);
    setAiLine(null);
    setSpeaking(false);
    if (audioUnlockedRef.current) {
      await demoAudioPlayer.playTransferTone(1600);
    } else {
      await new Promise((r) => setTimeout(r, 900));
    }
    setTransferring(false);
    setCursor(nextCursor);
  }, []);

  const playAi = useCallback(
    async (text: string, audioIndex?: number) => {
      setAiLine(text);
      setSpeaking(true);

      if (audioUnlockedRef.current) {
        let played = false;
        if (audioPrefix && audioIndex !== undefined) {
          played = await demoAudioPlayer.playMp3(`/demo-audio/${audioPrefix}-${audioIndex}.mp3`);
        }
        if (!played) {
          await speakDemoFallback(text);
        }
      } else {
        await new Promise((r) => setTimeout(r, Math.max(text.length * 55, 1800)));
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
            continue;
          }

          if (step.kind === "ai-voice") {
            await playAi(step.text, step.audioIndex);
            i += 1;
            continue;
          }

          if (step.kind === "sms") {
            if (step.variant === "crew") setCrewSms(step.text);
            else if (step.variant === "fyi") setFyiSms(step.text);
            else if (step.variant === "customer") setCustomerSms(step.text);
            else setOwnerSms(step.text);
            i += 1;
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
    (text: string) => {
      markUnlocked();
      setCustomerLines((prev) => [...prev, text]);
      void playTransferThenAdvance((c) => c + 1);
    },
    [markUnlocked, playTransferThenAdvance],
  );

  const handleMenuChoice = useCallback(
    (option: { customerText?: string; jumpTo?: number }) => {
      markUnlocked();
      if (option.customerText) {
        setCustomerLines((prev) => [...prev, option.customerText!]);
      }
      void playTransferThenAdvance(
        option.jumpTo !== undefined ? option.jumpTo : (c) => c + 1,
      );
    },
    [markUnlocked, playTransferThenAdvance],
  );

  const handleOwnerAction = useCallback(
    (systemText: string) => {
      markUnlocked();
      setSystemLine(systemText);
      void playTransferThenAdvance((c) => c + 1);
    },
    [markUnlocked, playTransferThenAdvance],
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
