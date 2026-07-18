"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InteractiveStep } from "@/lib/demo-interactive-script";

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
  const [speaking, setSpeaking] = useState(false);
  const [waitingForClick, setWaitingForClick] = useState(false);
  const [done, setDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const customerScrollRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    audioRef.current?.pause();
    runningRef.current = false;
    setCursor(0);
    setCustomerLines([]);
    setAiLine(null);
    setSystemLine(null);
    setOwnerSms(null);
    setCrewSms(null);
    setFyiSms(null);
    setSpeaking(false);
    setWaitingForClick(false);
    setDone(false);
  }, []);

  const playAi = useCallback(
    async (text: string, audioIndex?: number) => {
      setAiLine(text);
      setSpeaking(true);
      if (audioPrefix && audioIndex !== undefined) {
        const audio = new Audio(`/demo-audio/${audioPrefix}-${audioIndex}.mp3`);
        audioRef.current = audio;
        try {
          await audio.play();
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            setTimeout(resolve, Math.max(text.length * 78, 2800));
          });
        } catch {
          await new Promise((r) => setTimeout(r, Math.max(text.length * 78, 2800)));
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
      audioRef.current?.pause();
      return;
    }
    if (waitingForClick || done) return;
    void runAutoSteps(cursor);
  }, [enabled, cursor, waitingForClick, done, runAutoSteps]);

  const advanceWithCustomer = useCallback((text: string) => {
    setCustomerLines((prev) => [...prev, text]);
    setWaitingForClick(false);
    setCursor((c) => c + 1);
  }, []);

  const handleMenuChoice = useCallback((option: { customerText?: string }) => {
    if (option.customerText) {
      setCustomerLines((prev) => [...prev, option.customerText!]);
    }
    setWaitingForClick(false);
    setCursor((c) => c + 1);
  }, []);

  const handleOwnerAction = useCallback((systemText: string) => {
    setSystemLine(systemText);
    setWaitingForClick(false);
    setCursor((c) => c + 1);
  }, []);

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
    speaking,
    waitingForClick,
    done,
    currentStep,
    customerScrollRef,
    advanceWithCustomer,
    handleMenuChoice,
    handleOwnerAction,
    reset,
  };
}
