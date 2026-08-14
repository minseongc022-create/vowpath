"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { stopKoreanSpeech } from "@/topik/lib/korean/tts";
import { useTopikVi } from "@/topik/lib/i18n/TopikLocaleProvider";

type FocusState = {
  active: boolean;
  title?: string;
  subtitle?: string;
  exitHref?: string;
  progress?: string;
};

type FocusContextValue = {
  isFocused: boolean;
  title?: string;
  subtitle?: string;
  progress?: string;
  enterFocus: (opts: { title: string; subtitle?: string; exitHref?: string }) => void;
  setFocusProgress: (progress: string) => void;
  leaveFocus: () => void;
  exitFocus: () => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

export function TopikFocusProvider({ children }: { children: React.ReactNode }) {

  const router = useRouter();
  const [state, setState] = useState<FocusState>({ active: false });

  const enterFocus = useCallback((opts: { title: string; subtitle?: string; exitHref?: string }) => {
    setState({
      active: true,
      title: opts.title,
      subtitle: opts.subtitle,
      exitHref: opts.exitHref ?? "/topik",
    });
  }, []);

  const leaveFocus = useCallback(() => {
    stopKoreanSpeech();
    setState({ active: false });
  }, []);

  const exitFocus = useCallback(() => {
    stopKoreanSpeech();
    const href = state.exitHref ?? "/topik";
    setState({ active: false });
    router.push(href);
  }, [router, state.exitHref]);

  const setFocusProgress = useCallback((progress: string) => {
    setState((s) => (s.active ? { ...s, progress } : s));
  }, []);

  const value = useMemo(
    () => ({
      isFocused: state.active,
      title: state.title,
      subtitle: state.subtitle,
      progress: state.progress,
      enterFocus,
      setFocusProgress,
      leaveFocus,
      exitFocus,
    }),
    [state.active, state.title, state.subtitle, state.progress, enterFocus, setFocusProgress, leaveFocus, exitFocus],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useTopikFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    return {
      isFocused: false,
      enterFocus: () => {},
      setFocusProgress: () => {},
      leaveFocus: () => {},
      exitFocus: () => {},
    };
  }
  return ctx;
}

/** Sticky bar — exit only, shown during exam/study focus */
export function TopikFocusBar() {
  const vi = useTopikVi();
  const { isFocused, title, subtitle, progress, exitFocus } = useTopikFocus();
  if (!isFocused) return null;

  return (
    <header className="topik-focus-bar" role="banner">
      <button type="button" onClick={exitFocus} className="topik-focus-exit">
        ← {vi.focus.exit}
      </button>
      <div className="topik-focus-center">
        {title && <p className="topik-focus-title">{title}</p>}
        {subtitle && <p className="topik-focus-sub">{subtitle}</p>}
      </div>
      {progress ? <span className="topik-focus-progress">{progress}</span> : <span className="w-16" />}
    </header>
  );
}
