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
  GIU_LOCALE_COOKIE,
  normalizeGiuLocale,
  t,
  type GiuLocale,
} from "@/giu/lib/i18n";

type Ctx = {
  locale: GiuLocale;
  setLocale: (locale: GiuLocale) => void;
  tt: (key: Parameters<typeof t>[1]) => string;
};

const GiuLocaleContext = createContext<Ctx | null>(null);

function readCookieLocale(): GiuLocale {
  if (typeof document === "undefined") return "ko";
  const match = document.cookie.match(new RegExp(`(?:^|; )${GIU_LOCALE_COOKIE}=([^;]*)`));
  return normalizeGiuLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

export function GiuLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<GiuLocale>("ko");

  useEffect(() => {
    setLocaleState(readCookieLocale());
  }, []);

  const setLocale = useCallback((next: GiuLocale) => {
    setLocaleState(next);
    document.cookie = `${GIU_LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next === "vi" ? "vi" : "ko";
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      tt: (key) => t(locale, key),
    }),
    [locale, setLocale],
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

export function GiuLocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useGiuLocale();
  return (
    <div className={`inline-flex rounded-full bg-giu-bg p-0.5 text-xs font-semibold ring-1 ring-giu-border ${className}`}>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-full px-2.5 py-1 ${locale === "ko" ? "bg-white text-giu-ink shadow-sm" : "text-giu-muted"}`}
      >
        KO
      </button>
      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={`rounded-full px-2.5 py-1 ${locale === "vi" ? "bg-white text-giu-ink shadow-sm" : "text-giu-muted"}`}
      >
        VI
      </button>
    </div>
  );
}
