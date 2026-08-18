import type { JiucuVariant } from "./types";

const ASSETS: Record<JiucuVariant, string> = {
  default: "/giu/jiucu/default.png",
  excited: "/giu/jiucu/excited.png",
  curious: "/giu/jiucu/curious.png",
  search: "/giu/jiucu/search.png",
  shop: "/giu/jiucu/shop.png",
  enjoy: "/giu/jiucu/enjoy.png",
};

type Props = {
  variant?: JiucuVariant;
  className?: string;
  /** Kept for API compat — antenna wiggle handled by parent .giu-jiucu-3d */
  animated?: boolean;
};

/** Jiucu mascot from official character sheet PNGs. */
export function JiucuImage({ variant = "default", className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASSETS[variant]}
      alt="지우쿠"
      className={className}
      draggable={false}
      decoding="async"
    />
  );
}

export function jiucuSheetSrc(): string {
  return "/giu/jiucu/character-sheet.png";
}
