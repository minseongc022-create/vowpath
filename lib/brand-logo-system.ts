/**
 * Effiroad brand logo system — placement tokens (sizes only).
 * Aspect ratios come from lib/brand-dimensions.ts (generated with assets).
 */
import {
  BRAND_HORIZONTAL_HEIGHT,
  BRAND_HORIZONTAL_RATIO,
  BRAND_HORIZONTAL_WIDTH,
  BRAND_SYMBOL_HEIGHT,
  BRAND_SYMBOL_WIDTH,
} from "@/lib/brand-dimensions";

export {
  BRAND_HORIZONTAL_HEIGHT,
  BRAND_HORIZONTAL_RATIO,
  BRAND_HORIZONTAL_WIDTH,
  BRAND_SYMBOL_HEIGHT,
  BRAND_SYMBOL_WIDTH,
};

export type BrandLogoSurface = "default" | "header" | "footer" | "dark";

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
  heightPx?: number;
  symbolPx?: number;
  surface: BrandLogoSurface;
};

export const BRAND_LOGO_PLACEMENTS: Record<BrandLogoPlacement, PlacementSpec> = {
  "site-header": {
    layout: "horizontal",
    heightPx: 36,
    symbolPx: 32,
    surface: "default",
  },
  "site-footer": {
    layout: "horizontal",
    heightPx: 30,
    surface: "footer",
  },
  "dash-sidebar": {
    layout: "symbol",
    symbolPx: 36,
    surface: "dark",
  },
  "dash-header": {
    layout: "symbol",
    symbolPx: 32,
    surface: "header",
  },
  "auth-header": {
    layout: "horizontal",
    heightPx: 32,
    surface: "header",
  },
  hero: {
    layout: "symbol",
    symbolPx: 96,
    surface: "default",
  },
  "flow-hub": {
    layout: "symbol",
    symbolPx: 72,
    surface: "default",
  },
};

export function horizontalWidthForHeight(heightPx: number) {
  return Math.round(heightPx * BRAND_HORIZONTAL_RATIO);
}

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
