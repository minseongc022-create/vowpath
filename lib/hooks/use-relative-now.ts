"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 30_000;
const subscribers = new Set<() => void>();
let intervalId: number | undefined;
let visibilityBound = false;

function notifySubscribers() {
  for (const tick of subscribers) tick();
}

function ensureTicker(intervalMs: number) {
  if (typeof window === "undefined") return;
  if (intervalId === undefined) {
    intervalId = window.setInterval(notifySubscribers, intervalMs);
  }
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") notifySubscribers();
    });
  }
}

/** Shared clock tick so "N분 전" labels advance while the page stays open. */
export function useRelativeNow(intervalMs = DEFAULT_INTERVAL_MS): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    subscribers.add(tick);
    ensureTicker(intervalMs);
    return () => {
      subscribers.delete(tick);
    };
  }, [intervalMs]);

  return now;
}
