"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getTopikStrings,
  parseTopikLocale,
  type TopikLocale,
  type TopikStrings,
} from "@/topik/lib/i18n";

const STORAGE_KEY = "topik-locale";

type Ctx = {
  locale: TopikLocale;
  t: TopikStrings;
  setLocale: (locale: TopikLocale) => void;
};

const TopikLocaleContext = createContext<Ctx | null>(null);

export function TopikLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<TopikLocale>("vi");

  useEffect(() => {
    const saved = parseTopikLocale(localStorage.getItem(STORAGE_KEY));
    setLocaleState(saved);
  }, []);

  const setLocale = useCallback((next: TopikLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ locale, t: getTopikStrings(locale), setLocale }),
    [locale, setLocale],
  );

  return <TopikLocaleContext.Provider value={value}>{children}</TopikLocaleContext.Provider>;
}

export function useTopikLocale() {
  const ctx = useContext(TopikLocaleContext);
  if (!ctx) throw new Error("useTopikLocale must be used within TopikLocaleProvider");
  return ctx;
}

export function useTopikStrings() {
  return useTopikLocale().t;
}
