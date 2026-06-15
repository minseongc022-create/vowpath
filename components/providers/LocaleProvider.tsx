"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  isEnglishUiLocale,
  persistUiLocale,
  readClientUiLocale,
  type UiLocale,
} from "@/lib/locale";
import {
  getDashboardPageCopy,
  getDashboardUiCopy,
  getSettingsPageCopy,
  getVowDashboardCopy,
} from "@/lib/content";

type LocaleContextValue = {
  locale: UiLocale;
  setLocale: (locale: UiLocale) => void;
  isEnglish: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LocaleProviderProps = {
  initialLocale: UiLocale;
  children: ReactNode;
};

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<UiLocale>(initialLocale);

  useEffect(() => {
    const clientLocale = readClientUiLocale();
    if (clientLocale !== locale) {
      setLocaleState(clientLocale);
    }
    document.documentElement.lang = clientLocale === "ko" ? "ko" : "en";
  }, [locale]);

  const setLocale = (next: UiLocale) => {
    if (next === locale) return;
    persistUiLocale(next);
    window.location.reload();
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      isEnglish: isEnglishUiLocale(locale),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale requires LocaleProvider");
  }
  return ctx;
}

export function useIsEnglishUi(): boolean {
  return useLocale().isEnglish;
}

export function useVowDashboard() {
  const { locale } = useLocale();
  return useMemo(() => getVowDashboardCopy(locale), [locale]);
}

export function useDashboardUi() {
  const { locale } = useLocale();
  return useMemo(() => getDashboardUiCopy(locale), [locale]);
}

export function useDashboardPage() {
  const { locale } = useLocale();
  return useMemo(() => getDashboardPageCopy(locale), [locale]);
}

export function useSettingsPage() {
  const { locale } = useLocale();
  return useMemo(() => getSettingsPageCopy(locale), [locale]);
}
