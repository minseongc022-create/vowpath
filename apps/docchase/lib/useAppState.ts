"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState } from "@/lib/store";
import type { AppState } from "@/lib/types";

export function useRequireSession() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem("suimcheck.session")) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}

export function useAppState() {
  const ready = useRequireSession();
  const [state, setState] = useState<AppState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setState(loadState());
  }, [ready]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const commit = useCallback((next: AppState, message?: string) => {
    saveState(next);
    setState(next);
    if (message) setToast(message);
  }, []);

  const flash = useCallback((message: string) => setToast(message), []);

  return { ready, state, commit, toast, flash };
}
