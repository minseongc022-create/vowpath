"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePoll } from "./use-live-poll";

/** Fetch on mount + silent 60s refresh (no loading flicker after first load). */
export function useSilentFetch(run: () => Promise<void>, deps: unknown[] = []) {
  const hasLoaded = useRef(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else if (!hasLoaded.current) setInitialLoading(true);
    try {
      await run();
      hasLoaded.current = true;
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, deps);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLivePoll(() => {
    if (hasLoaded.current) void load(true);
  });

  return { initialLoading, refreshing, reload: () => load(false) };
}
