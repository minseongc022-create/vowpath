"use client";

import Image from "next/image";
import Link from "next/link";
import { ROUTES, SITE } from "@/lib/constants";

type BrandLogoProps = {
  className?: string;
  showName?: boolean;
  variant?: "default" | "light";
};

export function BrandLogo({
  className = "",
  showName = true,
  variant = "default",
}: BrandLogoProps) {
  const nameClass =
    variant === "light"
      ? "text-lg font-semibold tracking-tight text-white"
      : "text-lg font-semibold tracking-tight text-brand-950";

  return (
    <Link
      href={ROUTES.home}
      className={`flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 ${className}`}
      aria-label={`${SITE.name} 홈으로`}
    >
      <Image
        src="/logo.png"
        alt=""
        width={40}
        height={40}
        className="h-9 w-9 shrink-0 object-contain"
        priority
      />
      {showName ? <span className={nameClass}>{SITE.name}</span> : null}
    </Link>
  );
}
