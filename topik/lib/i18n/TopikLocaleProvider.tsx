"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ViStrings } from "@/topik/lib/i18n/strings";
import type { TopikUiLocale } from "@/topik/lib/i18n/locale";

type Ctx = {
  locale: TopikUiLocale;
  strings: ViStrings;
};

const TopikLocaleContext = createContext<Ctx | null>(null);

export function TopikLocaleProvider({
  locale,
  strings,
  children,
}: {
  locale: TopikUiLocale;
  strings: ViStrings;
  children: ReactNode;
}) {
  return (
    <TopikLocaleContext.Provider value={{ locale, strings }}>
      {children}
    </TopikLocaleContext.Provider>
  );
}

export function useTopikLocale(): TopikUiLocale {
  const ctx = useContext(TopikLocaleContext);
  if (!ctx) throw new Error("useTopikLocale requires TopikLocaleProvider");
  return ctx.locale;
}

export function useTopikVi(): ViStrings {
  const ctx = useContext(TopikLocaleContext);
  if (!ctx) throw new Error("useTopikVi requires TopikLocaleProvider");
  return ctx.strings;
}

export function useIsKoLocale(): boolean {
  return useTopikLocale() === "ko";
}
