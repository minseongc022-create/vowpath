"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { t, type GiuLocale } from "@/giu/lib/i18n";

type Ctx = {
  locale: GiuLocale;
  setLocale: (locale: GiuLocale) => void;
  tt: (key: Parameters<typeof t>[1]) => string;
};

const GiuLocaleContext = createContext<Ctx | null>(null);

export function GiuLocaleProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "ko";
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale: "ko",
      setLocale: () => undefined,
      tt: (key) => t("ko", key),
    }),
    [],
  );

  return (
    <GiuLocaleContext.Provider value={value}>{children}</GiuLocaleContext.Provider>
  );
}

export function useGiuLocale() {
  const ctx = useContext(GiuLocaleContext);
  if (!ctx) {
    return {
      locale: "ko" as GiuLocale,
      setLocale: () => undefined,
      tt: (key: Parameters<typeof t>[1]) => t("ko", key),
    };
  }
  return ctx;
}

/** Locale toggle removed — Korean only. */
export function GiuLocaleToggle(_props: { className?: string }) {
  return null;
}
