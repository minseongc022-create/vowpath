"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePoll } from "./use-live-poll";

/** Fetch on mount + silent background refresh (no UI flicker). */
export function useSilentFetch(run: () => Promise<void>, deps: unknown[] = []) {
  const hasLoaded = useRef(false);
  const runRef = useRef(run);
  runRef.current = run;
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent && !hasLoaded.current) setInitialLoading(true);
    try {
      await runRef.current();
      hasLoaded.current = true;
    } finally {
      setInitialLoading(false);
    }
  }, deps);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLivePoll(() => {
    if (hasLoaded.current) void load(true);
  });

  return { initialLoading, reload: () => load(false) };
}
