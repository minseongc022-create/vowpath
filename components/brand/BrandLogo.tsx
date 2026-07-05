"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BRAND_HORIZONTAL_HEIGHT,
  BRAND_HORIZONTAL_RATIO,
  BRAND_HORIZONTAL_WIDTH,
  BRAND_SYMBOL_HEIGHT,
  BRAND_SYMBOL_WIDTH,
  BRAND_LOGO_PLACEMENTS,
  type BrandLogoPlacement,
  legacyPlacementFromSize,
} from "@/lib/brand-logo-system";
import { pickBrandHorizontalSrc, pickBrandIconSrc } from "@/lib/brand-assets";
import { ROUTES, SITE } from "@/lib/constants";
import { getBrandLogoTagline } from "@/lib/marketing-constants";

type BrandLogoProps = {
  className?: string;
  placement?: BrandLogoPlacement;
  showName?: boolean;
  showTagline?: boolean;
  variant?: "default" | "light" | "dark";
  surface?: "default" | "header" | "footer" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  layout?: "horizontal" | "icon" | "symbol" | "responsive" | "lockup";
  href?: string;
};

function resolvePlacement(props: BrandLogoProps): BrandLogoPlacement {
  if (props.placement) return props.placement;
  const surface =
    props.surface ??
    (props.variant === "dark" ? "dark" : props.variant === "light" ? "header" : undefined);
  return legacyPlacementFromSize(props.size ?? "md", surface);
}

function SymbolMark({
  boxPx,
  surface,
  priority = true,
}: {
  boxPx: number;
  surface: "default" | "header" | "footer" | "dark";
  priority?: boolean;
}) {
  return (
    <span
      className="vow-brand-logo__symbol"
      style={{ width: boxPx, height: boxPx }}
      data-surface={surface}
    >
      <Image
        src={pickBrandIconSrc(surface)}
        alt={SITE.name}
        width={BRAND_SYMBOL_WIDTH}
        height={BRAND_SYMBOL_HEIGHT}
        className="vow-brand-logo__symbol-img"
        priority={priority}
      />
    </span>
  );
}

function HorizontalMark({
  heightPx,
  surface,
  priority = true,
}: {
  heightPx: number;
  surface: "default" | "header" | "footer" | "dark";
  priority?: boolean;
}) {
  const widthPx = Math.round(heightPx * BRAND_HORIZONTAL_RATIO);

  return (
    <span
      className="vow-brand-logo__horizontal block leading-none"
      style={{ height: heightPx, width: widthPx }}
      data-surface={surface}
    >
      <Image
        src={pickBrandHorizontalSrc(surface)}
        alt={SITE.name}
        width={BRAND_HORIZONTAL_WIDTH}
        height={BRAND_HORIZONTAL_HEIGHT}
        className="vow-brand-logo__horizontal-img block"
        style={{ height: heightPx, width: widthPx }}
        priority={priority}
      />
    </span>
  );
}

function CssLockup({
  symbolPx,
  surface,
  priority = true,
}: {
  symbolPx: number;
  surface: "default" | "header" | "footer" | "dark";
  priority?: boolean;
}) {
  return (
    <span className="vow-brand-logo__lockup inline-flex items-center gap-2.5">
      <SymbolMark boxPx={symbolPx} surface={surface} priority={priority} />
      <span
        className={`vow-brand-logo__wordmark font-serif text-[1.375rem] font-semibold leading-none tracking-[-0.02em] ${
          surface === "footer" ? "text-brand-800" : "text-brand-900"
        }`}
      >
        {SITE.name}
      </span>
    </span>
  );
}

export function BrandLogo({
  className = "",
  placement,
  showName = false,
  showTagline = false,
  variant,
  surface,
  size,
  layout,
  href = ROUTES.home,
}: BrandLogoProps) {
  const resolved = resolvePlacement({ placement, variant, surface, size });
  const spec = BRAND_LOGO_PLACEMENTS[resolved];

  let mark: ReactNode;

  if (layout === "icon" || layout === "symbol") {
    mark = <SymbolMark boxPx={spec.symbolPx ?? 32} surface={spec.surface} />;
  } else if (layout === "lockup") {
    mark = <CssLockup symbolPx={spec.symbolPx ?? 36} surface={spec.surface} />;
  } else if (layout === "horizontal" && spec.heightPx) {
    mark = <HorizontalMark heightPx={spec.heightPx} surface={spec.surface} />;
  } else if (resolved === "site-header") {
    mark = (
      <>
        <span className="sm:hidden">
          <HorizontalMark heightPx={30} surface={spec.surface} />
        </span>
        <span className="hidden sm:block">
          <HorizontalMark heightPx={38} surface={spec.surface} />
        </span>
      </>
    );
  } else if (resolved === "site-footer") {
    mark = <HorizontalMark heightPx={32} surface={spec.surface} />;
  } else if (spec.layout === "horizontal" && spec.heightPx) {
    mark = <HorizontalMark heightPx={spec.heightPx} surface={spec.surface} />;
  } else {
    mark = <SymbolMark boxPx={spec.symbolPx ?? 32} surface={spec.surface} />;
  }

  return (
    <Link
      href={href}
      className={`vow-brand-logo group shrink-0 flex items-center ${className}`}
      aria-label={`${SITE.name} home`}
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
