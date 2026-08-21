"use client";

import { useEffect, useRef } from "react";

/** Poll callback every intervalMs while tab is visible. Does not fire on mount. */
export function useLivePoll(callback: () => void, intervalMs = 60_000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;

    function tick() {
      cbRef.current();
    }

    function start() {
      if (id) clearInterval(id);
      id = setInterval(tick, intervalMs);
    }

    function stop() {
      if (id) clearInterval(id);
      id = undefined;
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") {
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
}
