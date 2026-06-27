/**
 * Effiroad brand logo system — sizing, clearspace, and aspect ratios.
 * All logo placements should use these tokens (Stripe/Notion-style consistency).
 */

/** Exported horizontal wordmark aspect (640×85 source) */
export const BRAND_HORIZONTAL_RATIO = 640 / 85;

/** Symbol mark is exported square with built-in clearspace padding */
export const BRAND_SYMBOL_RATIO = 1;

/** Minimum clearspace around the mark (fraction of display height) */
export const BRAND_CLEARSPACE_RATIO = 0.14;

export type BrandLogoSurface = "default" | "header" | "footer" | "dark";

/** Where the logo appears — drives size, layout, and surface */
export type BrandLogoPlacement =
  | "site-header"
  | "site-footer"
  | "dash-sidebar"
  | "dash-header"
  | "auth-header"
  | "hero"
  | "flow-hub";

type PlacementSpec = {
  layout: "horizontal" | "symbol";
  /** Display height in px (horizontal lockup) */
  heightPx?: number;
  /** Symbol frame box in px (square clearspace frame) */
  symbolPx?: number;
  surface: BrandLogoSurface;
  /** Source pixel width for next/image (2× display for retina) */
  srcScale: number;
};

export const BRAND_LOGO_PLACEMENTS: Record<BrandLogoPlacement, PlacementSpec> = {
  "site-header": {
    layout: "horizontal",
    heightPx: 38,
    symbolPx: 36,
    surface: "default",
    srcScale: 2.5,
  },
  "site-footer": {
    layout: "horizontal",
    heightPx: 32,
    surface: "footer",
    srcScale: 2.5,
  },
  "dash-sidebar": {
    layout: "symbol",
    symbolPx: 40,
    surface: "dark",
    srcScale: 2.5,
  },
  "dash-header": {
    layout: "symbol",
    symbolPx: 36,
    surface: "header",
    srcScale: 2.5,
  },
  "auth-header": {
    layout: "horizontal",
    heightPx: 34,
    surface: "header",
    srcScale: 2.5,
  },
  hero: {
    layout: "symbol",
    symbolPx: 112,
    surface: "default",
    srcScale: 2,
  },
  "flow-hub": {
    layout: "symbol",
    symbolPx: 80,
    surface: "default",
    srcScale: 2,
  },
};

export function horizontalWidthForHeight(heightPx: number) {
  return Math.round(heightPx * BRAND_HORIZONTAL_RATIO);
}

export function clearspacePx(displayPx: number) {
  return Math.max(4, Math.round(displayPx * BRAND_CLEARSPACE_RATIO));
}

/** @deprecated Use BrandLogoPlacement — maps legacy size props */
export function legacyPlacementFromSize(
  size: "sm" | "md" | "lg" | "xl",
  surface?: BrandLogoSurface,
): BrandLogoPlacement {
  if (surface === "footer") return "site-footer";
  if (surface === "dark") return "dash-sidebar";
  if (surface === "header") return "auth-header";
  if (size === "lg" || size === "xl") return "site-header";
  if (size === "sm") return "dash-sidebar";
  return "dash-header";
}
