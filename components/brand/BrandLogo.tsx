"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_LOGO_SRC } from "@/lib/brand-assets";
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
  href?: string;
};

const logoSizes = {
  sm: { box: "h-10 w-10", px: 40 },
  md: { box: "h-11 w-11", px: 44 },
  lg: { box: "h-14 w-14", px: 56 },
  xl: { box: "h-16 w-16", px: 64 },
};

export function BrandLogo({
  className = "",
  showName = false,
  showTagline = false,
  variant = "default",
  size = "md",
  href = ROUTES.home,
}: BrandLogoProps) {
  const logo = logoSizes[size];
  const onDark = variant === "light" || variant === "dark";

  return (
    <Link
      href={href}
      className={`group inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
      aria-label={isEnglishUi() ? `${SITE.name} home` : `${SITE.name} 홈으로`}
    >
      <span className={`relative shrink-0 ${logo.box} ${onDark ? "vow-brand-mark-flat" : "vow-brand-mark-wrap"}`}>
        <Image
          src={BRAND_LOGO_SRC}
          alt={SITE.name}
          width={logo.px}
          height={logo.px}
          className={`vow-brand-mark-img relative z-10 ${logo.box} rounded-[18%] object-contain object-center`}
          priority
        />
      </span>
      {(showName || showTagline) && (
        <span className="sr-only">
          {SITE.name}
          {showTagline ? ` — ${getBrandLogoTagline()}` : ""}
        </span>
      )}
    </Link>
  );
}
