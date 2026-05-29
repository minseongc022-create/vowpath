"use client";

import Image from "next/image";
import Link from "next/link";
import { ROUTES, SITE } from "@/lib/constants";

type BrandLogoProps = {
  className?: string;
  showName?: boolean;
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
};

const iconSizes = {
  sm: { box: "h-8 w-8", px: 32 },
  md: { box: "h-9 w-9", px: 40 },
  lg: { box: "h-12 w-12", px: 48 },
};

export function BrandLogo({
  className = "",
  showName = true,
  variant = "default",
  size = "md",
}: BrandLogoProps) {
  const icon = iconSizes[size];

  const nameClass =
    variant === "light"
      ? "bg-gradient-to-r from-white via-brand-100 to-brand-200 bg-clip-text text-transparent"
      : "bg-gradient-to-r from-brand-950 via-brand-700 to-brand-400 bg-clip-text text-transparent";

  return (
    <Link
      href={ROUTES.home}
      className={`flex shrink-0 items-center gap-1.5 transition-opacity hover:opacity-90 ${className}`}
      aria-label={`${SITE.name} 홈으로`}
    >
      <Image
        src="/logo.png"
        alt=""
        width={icon.px}
        height={icon.px}
        className={`${icon.box} shrink-0 object-contain object-left`}
        priority
      />
      {showName ? (
        <span
          className={`-ml-0.5 text-lg font-bold uppercase leading-none tracking-[0.1em] ${nameClass}`}
        >
          {SITE.name}
        </span>
      ) : null}
    </Link>
  );
}
