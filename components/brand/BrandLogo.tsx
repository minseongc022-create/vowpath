"use client";

import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO_PLACEMENTS,
  type BrandLogoPlacement,
  type BrandLogoSurface,
  clearspacePx,
  horizontalWidthForHeight,
  legacyPlacementFromSize,
} from "@/lib/brand-logo-system";
import { pickBrandHorizontalSrc, pickBrandIconSrc } from "@/lib/brand-assets";
import { ROUTES, SITE } from "@/lib/constants";
import { getBrandLogoTagline } from "@/lib/marketing-constants";
import { isEnglishUi } from "@/lib/locale";

type BrandLogoProps = {
  className?: string;
  /** Preferred — consistent placement token */
  placement?: BrandLogoPlacement;
  /** @deprecated Use placement */
  showName?: boolean;
  /** @deprecated Logo image includes the tagline */
  showTagline?: boolean;
  /** @deprecated Use placement */
  variant?: "default" | "light" | "dark";
  /** @deprecated Use placement */
  surface?: BrandLogoSurface;
  /** @deprecated Use placement */
  size?: "sm" | "md" | "lg" | "xl";
  /** @deprecated Derived from placement */
  layout?: "horizontal" | "icon" | "symbol" | "responsive";
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
  px,
  surface,
  srcScale,
  priority = true,
}: {
  px: number;
  surface: BrandLogoSurface;
  srcScale: number;
  priority?: boolean;
}) {
  const pad = clearspacePx(px);
  const frame = px + pad * 2;
  const src = pickBrandIconSrc(surface);
  const srcPx = Math.round(frame * srcScale);

  return (
    <span
      className="vow-brand-logo__frame vow-brand-logo__frame--symbol"
      style={
        {
          "--brand-symbol-frame": `${frame}px`,
          "--brand-symbol-pad": `${pad}px`,
        } as CSSProperties
      }
      data-surface={surface}
    >
      <Image
        src={src}
        alt={SITE.name}
        width={srcPx}
        height={srcPx}
        className="vow-brand-logo__img vow-brand-logo__img--symbol"
        priority={priority}
      />
    </span>
  );
}

function HorizontalMark({
  heightPx,
  surface,
  srcScale,
  priority = true,
}: {
  heightPx: number;
  surface: BrandLogoSurface;
  srcScale: number;
  priority?: boolean;
}) {
  const widthPx = horizontalWidthForHeight(heightPx);
  const padY = clearspacePx(heightPx);
  const src = pickBrandHorizontalSrc(surface);
  const srcW = Math.round(widthPx * srcScale);
  const srcH = Math.round(heightPx * srcScale);

  return (
    <span
      className="vow-brand-logo__frame vow-brand-logo__frame--horizontal"
      style={
        {
          "--brand-logo-h": `${heightPx}px`,
          "--brand-logo-w": `${widthPx}px`,
          "--brand-logo-pad-y": `${padY}px`,
        } as CSSProperties
      }
      data-surface={surface}
    >
      <Image
        src={src}
        alt={SITE.name}
        width={srcW}
        height={srcH}
        className="vow-brand-logo__img vow-brand-logo__img--horizontal"
        priority={priority}
      />
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
  const resolvedSurface = spec.surface;

  let mark: ReactNode;

  if (layout === "icon" || layout === "symbol") {
    mark = (
      <SymbolMark
        px={spec.symbolPx ?? 36}
        surface={resolvedSurface}
        srcScale={spec.srcScale}
      />
    );
  } else if (layout === "horizontal") {
    mark = (
      <HorizontalMark
        heightPx={spec.heightPx ?? 36}
        surface={resolvedSurface}
        srcScale={spec.srcScale}
      />
    );
  } else if (resolved === "site-header") {
    mark = (
      <>
        <span className="lg:hidden">
          <SymbolMark px={spec.symbolPx ?? 36} surface={resolvedSurface} srcScale={spec.srcScale} />
        </span>
        <span className="hidden lg:inline-flex">
          <HorizontalMark
            heightPx={spec.heightPx ?? 38}
            surface={resolvedSurface}
            srcScale={spec.srcScale}
          />
        </span>
      </>
    );
  } else if (spec.layout === "horizontal" && spec.heightPx) {
    mark = (
      <HorizontalMark
        heightPx={spec.heightPx}
        surface={resolvedSurface}
        srcScale={spec.srcScale}
      />
    );
  } else {
    mark = (
      <SymbolMark
        px={spec.symbolPx ?? 36}
        surface={resolvedSurface}
        srcScale={spec.srcScale}
      />
    );
  }

  return (
    <Link
      href={href}
      className={`vow-brand-logo group shrink-0 ${className}`}
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
