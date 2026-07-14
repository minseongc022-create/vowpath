"use client";

import { useCallback, useEffect, useState } from "react";

export const ASSISTANT_HINT_KEY = "effiroad-ai-hint-v3";

export function useAssistantHint() {
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ASSISTANT_HINT_KEY)) return;
    const t = window.setTimeout(() => setHintVisible(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    sessionStorage.setItem(ASSISTANT_HINT_KEY, "1");
  }, []);

  return { hintVisible, dismissHint };
}
