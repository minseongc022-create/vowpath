"use client";

import { useEffect } from "react";

/** Poll callback every 60s while tab is visible (matches server cron interval). */
export function useLivePoll(callback: () => void, intervalMs = 60_000) {
  useEffect(() => {
    callback();
    let id: ReturnType<typeof setInterval> | undefined;

    function start() {
      if (id) clearInterval(id);
      id = setInterval(callback, intervalMs);
    }

    function stop() {
      if (id) clearInterval(id);
      id = undefined;
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        callback();
        start();
      } else {
        stop();
      }
    }

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, intervalMs]);
}
