import Image from "next/image";
import { BRAND_WORDMARK_SRC } from "@/lib/brand-assets";

/** Hero / marketing — full official wordmark from brand board */
export function BrandHeroVisual() {
  return (
    <div className="relative flex flex-col items-center">
      <span className="vow-brand-aura pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72" aria-hidden />
      <Image
        src={BRAND_WORDMARK_SRC}
        alt="Vowpath — Trusted calls. Better business."
        width={520}
        height={280}
        className="relative z-10 h-auto w-full max-w-[min(100%,22rem)] object-contain drop-shadow-[0_8px_32px_rgba(10,132,199,0.35)] sm:max-w-md"
        priority
      />
    </div>
  );
}
