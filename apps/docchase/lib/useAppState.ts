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

  // Pick up public /s/[token] uploads written in another tab (same browser demo)
  useEffect(() => {
    if (!ready) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "suimcheck.v3" || e.key === "suimcheck.public.submissions.v1" || e.key === "suimcheck.public.replies.v1") {
        setState(loadState());
      }
    };
    const poll = window.setInterval(() => {
      setState((prev) => {
        const next = loadState();
        if (!prev) return next;
        if (JSON.stringify(prev.clients) === JSON.stringify(next.clients)) return prev;
        return next;
      });
    }, 2500);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
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
