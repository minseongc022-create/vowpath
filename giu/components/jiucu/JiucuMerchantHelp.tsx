"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GiuLocale } from "@/giu/lib/i18n";
import { t } from "@/giu/lib/i18n";

type Props = {
  locale: GiuLocale;
  caption?: string;
  className?: string;
};

type Motion = "greet" | "cheer" | "show" | "team";

/** Merchant publish hero — single PNG, whole-body motion only (no arm layers). */
export function JiucuMerchantHelp({ locale, caption, className = "" }: Props) {
  const reactions = useMemo(
    () =>
      [
        { bubble: t(locale, "jiucuAuthMerchant"), motion: "greet" as Motion },
        { bubble: t(locale, "jiucuTapCheer"), motion: "cheer" as Motion },
        { bubble: t(locale, "jiucuTapShow"), motion: "show" as Motion },
        { bubble: t(locale, "jiucuTapTeam"), motion: "team" as Motion },
      ] as const,
    [locale],
  );

  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const active = reactions[index];

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, []);

  const onTap = useCallback(() => {
    setIndex((i) => (i + 1) % reactions.length);
    setAnimKey((k) => k + 1);
  }, [reactions.length]);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative w-full max-w-[300px]">
        <div
          key={`bubble-${index}-${animKey}`}
          className="giu-jiucu-merchant-bubble absolute left-1/2 top-2 z-20 -translate-x-1/2 max-w-[92%] whitespace-nowrap rounded-2xl bg-white px-3.5 py-2 text-center text-[12px] font-bold text-giu-ink shadow-[0_4px_18px_rgba(60,42,33,0.08)] ring-1 ring-giu-border/80"
        >
          {active.bubble}
          <span
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white ring-1 ring-giu-border/80"
            aria-hidden
          />
        </div>

        <button
          type="button"
          onClick={onTap}
          className="giu-tap relative flex w-full min-h-[210px] items-end justify-center overflow-hidden rounded-[20px] bg-white px-3 pb-3 pt-12"
          aria-label="지우쿠와 대화하기"
        >
          <div
            className="pointer-events-none absolute inset-x-10 bottom-5 h-8 rounded-full bg-[rgba(60,42,33,0.04)] blur-lg"
            aria-hidden
          />

          <div
            key={animKey}
            className={`giu-jiucu-figure giu-jiucu-motion-${active.motion} relative w-[200px] max-w-full`}
            style={{ aspectRatio: "1024 / 1536" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/giu/jiucu/merchant-help-white.png"
              alt="지우쿠"
              className="absolute inset-0 h-full w-full select-none object-contain object-bottom"
              draggable={false}
              decoding="async"
            />
          </div>
        </button>
      </div>

      {caption ? (
        <p className="max-w-[260px] text-center text-[12px] font-semibold leading-snug text-giu-muted">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
