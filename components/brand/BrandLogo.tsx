"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_MARK_SRC } from "@/lib/brand-assets";
import { ROUTES, SITE } from "@/lib/constants";
import { getBrandLogoTagline } from "@/lib/marketing-constants";
import { isEnglishUi } from "@/lib/locale";

type BrandLogoProps = {
  className?: string;
  showName?: boolean;
  showTagline?: boolean;
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
};

const markSizes = {
  sm: { box: "h-8 w-8", px: 32 },
  md: { box: "h-10 w-10", px: 40 },
  lg: { box: "h-11 w-11", px: 44 },
  xl: { box: "h-12 w-12", px: 48 },
};

const nameSizes = {
  sm: "text-sm tracking-[0.12em]",
  md: "text-sm tracking-[0.14em]",
  lg: "text-base tracking-[0.16em]",
  xl: "text-base tracking-[0.18em] sm:text-lg",
};

export function BrandLogo({
  className = "",
  showName = true,
  showTagline = false,
  variant = "default",
  size = "md",
  href = ROUTES.home,
}: BrandLogoProps) {
  const mark = markSizes[size];
  const onDark = variant === "light" || variant === "dark";

  return (
    <Link
      href={href}
      className={`group inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
      aria-label={isEnglishUi() ? `${SITE.name} home` : `${SITE.name} 홈으로`}
    >
      <span
        className={`relative shrink-0 ${mark.box} ${
          onDark ? "vow-brand-mark-flat" : "vow-brand-mark-wrap"
        }`}
      >
        <Image
          src={BRAND_MARK_SRC}
          alt=""
          width={mark.px}
          height={mark.px}
          className={`vow-brand-mark-img relative z-10 ${mark.box} object-contain object-center`}
          priority
        />
      </span>
      {showName || showTagline ? (
        <span className="flex min-w-0 flex-col justify-center gap-px leading-none">
          {showName ? (
            <span
              className={`font-semibold uppercase ${nameSizes[size]} ${
                onDark ? "text-slate-200" : "text-brand-900"
              }`}
            >
              {SITE.name.toUpperCase()}
            </span>
          ) : null}
          {showTagline ? (
            <span className="hidden text-[10px] leading-[1.15] text-slate-500 sm:block">
              {getBrandLogoTagline()}
            </span>
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}
