"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO_HORIZONTAL_SRC,
  BRAND_LOGO_ICON_SRC,
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
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  /** horizontal = full lockup, icon = ER mark, responsive = icon on mobile + horizontal on lg+ */
  layout?: "horizontal" | "icon" | "responsive";
  href?: string;
};

const iconSizes = {
  sm: { box: "h-10 w-10", px: 40 },
  md: { box: "h-11 w-11", px: 44 },
  lg: { box: "h-12 w-12", px: 48 },
  xl: { box: "h-14 w-14", px: 56 },
};

const horizontalSizes = {
  sm: { class: "h-12 w-auto max-w-[11rem]", w: 176, h: 48 },
  md: { class: "h-14 w-auto max-w-[13rem]", w: 208, h: 56 },
  lg: { class: "h-16 w-auto max-w-[18rem]", w: 288, h: 64 },
  xl: { class: "h-[4.5rem] w-auto max-w-[20rem]", w: 320, h: 72 },
};

function resolveLayout(size: BrandLogoProps["size"], layout?: BrandLogoProps["layout"]) {
  if (layout) return layout;
  return size === "sm" || size === "md" ? "icon" : "responsive";
}

export function BrandLogo({
  className = "",
  showName = false,
  showTagline = false,
  size = "md",
  layout,
  href = ROUTES.home,
}: BrandLogoProps) {
  const resolvedLayout = resolveLayout(size, layout);
  const icon = iconSizes[size];
  const horizontal = horizontalSizes[size];

  const iconImage = (
    <Image
      src={BRAND_LOGO_ICON_SRC}
      alt={SITE.name}
      width={icon.px}
      height={icon.px}
      className={`vow-brand-mark-img ${icon.box} object-contain object-center`}
      priority
    />
  );

  const horizontalImage = (
    <Image
      src={BRAND_LOGO_HORIZONTAL_SRC}
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
