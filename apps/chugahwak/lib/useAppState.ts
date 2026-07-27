"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState } from "./store";
import type { AppState } from "./types";

export function useAppState() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("chugahwak.session")) {
      router.replace("/login");
      return;
    }
    setState(loadState());
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const commit = useCallback((next: AppState, message?: string) => {
    saveState(next);
    setState(next);
    if (message) setToast(message);
  }, []);

  return { ready, state, commit, toast, flash: setToast };
}
