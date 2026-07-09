"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getLinkIntakeCopy,
  linkIntakePageCopy,
  type LinkIntakeCopy,
} from "@/lib/link-intake-copy";

const LinkIntakeCopyContext = createContext<LinkIntakeCopy>(linkIntakePageCopy);

/**
 * Provides the customer-facing intake copy in the visitor's language. Detects
 * the browser language on mount (Spanish → Spanish copy) so a Spanish-speaking
 * customer sees the whole form in Spanish, while everyone else stays English.
 * SSR-safe: renders English first, then swaps after mount if the browser is
 * Spanish (no hydration mismatch, brief English flash only for es visitors).
 * Any component without this provider falls back to English automatically.
 */
export function LinkIntakeCopyProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<"en" | "es">("en");

  useEffect(() => {
    const langs =
      typeof navigator !== "undefined"
        ? [navigator.language, ...(navigator.languages ?? [])]
        : [];
    if (langs.some((l) => l?.toLowerCase().startsWith("es"))) {
      setLocale("es");
    }
  }, []);

  const copy = useMemo(() => getLinkIntakeCopy(locale), [locale]);

  return (
    <LinkIntakeCopyContext.Provider value={copy}>{children}</LinkIntakeCopyContext.Provider>
  );
}

/** Customer-facing intake copy in the visitor's language (English if no provider). */
export function useLinkIntakeCopy(): LinkIntakeCopy {
  return useContext(LinkIntakeCopyContext);
}
