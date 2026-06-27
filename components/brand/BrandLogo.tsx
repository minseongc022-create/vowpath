"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  type BrandLogoSurface,
  pickBrandHorizontalSrc,
  pickBrandIconSrc,
} from "@/lib/brand-assets";
import { ROUTES, SITE } from "@/lib/constants";
import { getBrandLogoTagline } from "@/lib/marketing-constants";
import { isEnglishUi } from "@/lib/locale";

type BrandLogoProps = {
  className?: string;
  /** @deprecated Logo image includes the wordmark */
  showName?: boolean;
  /** @deprecated Logo image includes the tagline */
  showTagline?: boolean;
  /** dark = chocolate sidebar; light = on white panels */
  variant?: "default" | "light" | "dark";
  /** Match exported PNG backing to the surrounding UI */
  surface?: BrandLogoSurface;
  size?: "sm" | "md" | "lg" | "xl";
  /** horizontal = full lockup, icon = ER mark, responsive = icon on mobile + horizontal on lg+ */
  layout?: "horizontal" | "icon" | "responsive";
  href?: string;
};

const iconSizes = {
  sm: { box: "h-11 w-11", px: 88 },
  md: { box: "h-12 w-12", px: 96 },
  lg: { box: "h-12 w-12", px: 96 },
  xl: { box: "h-14 w-14", px: 112 },
};

const horizontalSizes = {
  sm: { class: "h-9 w-auto max-w-[10.5rem]", w: 168, h: 36 },
  md: { class: "h-10 w-auto max-w-[12rem]", w: 192, h: 40 },
  lg: { class: "h-10 w-auto max-w-[13.5rem] sm:h-11", w: 216, h: 44 },
  xl: { class: "h-11 w-auto max-w-[15rem]", w: 240, h: 44 },
};

function resolveLayout(size: BrandLogoProps["size"], layout?: BrandLogoProps["layout"]) {
  if (layout) return layout;
  return size === "sm" || size === "md" ? "icon" : "responsive";
}

function resolveSurface(
  surface: BrandLogoSurface | undefined,
  variant: BrandLogoProps["variant"],
): BrandLogoSurface {
  if (surface) return surface;
  if (variant === "dark") return "dark";
  if (variant === "light") return "header";
  return "default";
}

export function BrandLogo({
  className = "",
  showName = false,
  showTagline = false,
  variant = "default",
  surface,
  size = "md",
  layout,
  href = ROUTES.home,
}: BrandLogoProps) {
  const resolvedLayout = resolveLayout(size, layout);
  const resolvedSurface = resolveSurface(surface, variant);
  const icon = iconSizes[size];
  const horizontal = horizontalSizes[size];
  const iconSrc = pickBrandIconSrc(resolvedSurface);
  const horizontalSrc = pickBrandHorizontalSrc(
    resolvedSurface === "dark" ? "default" : resolvedSurface,
  );

  const iconClass =
    resolvedSurface === "dark"
      ? `${icon.box} object-contain object-center drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]`
      : `${icon.box} object-contain object-center`;

  const iconImage = (
    <Image
      src={iconSrc}
      alt={SITE.name}
      width={icon.px}
      height={icon.px}
      className={`vow-brand-mark-img ${iconClass}`}
      priority
    />
  );

  const horizontalImage = (
    <Image
      src={horizontalSrc}
      alt={SITE.name}
      width={horizontal.w}
      height={horizontal.h}
      className={`vow-brand-mark-img ${horizontal.class} object-contain object-left`}
      priority
    />
  );

  let mark: ReactNode;
  if (resolvedLayout === "horizontal") {
    mark = horizontalImage;
  } else if (resolvedLayout === "icon") {
    mark = iconImage;
  } else {
    mark = (
      <>
        <span className={`shrink-0 lg:hidden ${icon.box}`}>{iconImage}</span>
        <span className="hidden shrink-0 lg:block">{horizontalImage}</span>
      </>
    );
  }

  return (
    <Link
      href={href}
      className={`group inline-flex shrink-0 items-center transition-opacity hover:opacity-90 ${className}`}
      aria-label={isEnglishUi() ? `${SITE.name} home` : `${SITE.name} 홈으로`}
    >
      {mark}
      {(showName || showTagline) && (
        <span className="sr-only">
          {SITE.name}
          {showTagline ? ` — ${getBrandLogoTagline()}` : ""}
        </span>
      )}
    </Link>
  );
}
