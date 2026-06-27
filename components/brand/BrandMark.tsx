import type { CSSProperties } from "react";
import Image from "next/image";
import {
  BRAND_LOGO_PLACEMENTS,
  BRAND_SYMBOL_HEIGHT,
  BRAND_SYMBOL_WIDTH,
  type BrandLogoPlacement,
} from "@/lib/brand-logo-system";
import { pickBrandIconSrc } from "@/lib/brand-assets";
import { SITE } from "@/lib/constants";

type BrandMarkProps = {
  placement?: BrandLogoPlacement;
  alt?: string;
  className?: string;
  priority?: boolean;
};

/** Symbol-only brand mark for hero, cards, and decorative contexts */
export function BrandMark({
  placement = "hero",
  alt = `${SITE.name} mark`,
  className = "",
  priority = false,
}: BrandMarkProps) {
  const spec = BRAND_LOGO_PLACEMENTS[placement];
  const boxPx = spec.symbolPx ?? 96;

  return (
    <div className={`vow-brand-mark ${className}`} data-placement={placement}>
      <span
        className="vow-brand-logo__symbol vow-brand-mark__symbol"
        style={{ width: boxPx, height: boxPx } as CSSProperties}
        data-surface={spec.surface}
      >
        <Image
          src={pickBrandIconSrc(spec.surface)}
          alt={alt}
          width={BRAND_SYMBOL_WIDTH}
          height={BRAND_SYMBOL_HEIGHT}
          className="vow-brand-logo__symbol-img"
          priority={priority}
        />
      </span>
    </div>
  );
}
