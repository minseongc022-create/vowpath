import type { CSSProperties } from "react";
import Image from "next/image";
import {
  BRAND_LOGO_PLACEMENTS,
  type BrandLogoPlacement,
  clearspacePx,
} from "@/lib/brand-logo-system";
import { pickBrandIconSrc } from "@/lib/brand-assets";
import { SITE } from "@/lib/constants";

type BrandMarkProps = {
  placement?: BrandLogoPlacement;
  /** Override alt text */
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
  const px = spec.symbolPx ?? 96;
  const pad = clearspacePx(px);
  const frame = px + pad * 2;
  const src = pickBrandIconSrc(spec.surface);
  const srcPx = Math.round(frame * spec.srcScale);

  return (
    <div className={`vow-brand-mark ${className}`} data-placement={placement}>
      <span
        className="vow-brand-logo__frame vow-brand-logo__frame--symbol vow-brand-mark__frame"
        style={
          {
            "--brand-symbol-frame": `${frame}px`,
            "--brand-symbol-pad": `${pad}px`,
          } as CSSProperties
        }
        data-surface={spec.surface}
      >
        <Image
          src={src}
          alt={alt}
          width={srcPx}
          height={srcPx}
          className="vow-brand-logo__img vow-brand-logo__img--symbol"
          priority={priority}
        />
      </span>
    </div>
  );
}
