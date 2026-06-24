import Image from "next/image";
import { BRAND_LOGO_SRC } from "@/lib/brand-assets";

/** Hero / marketing — official square brand lockup */
export function BrandHeroVisual() {
  return (
    <div className="relative flex flex-col items-center">
      <span className="vow-brand-aura pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72" aria-hidden />
      <Image
        src={BRAND_LOGO_SRC}
        alt="Vowpath — ai call · booking"
        width={520}
        height={520}
        className="relative z-10 h-auto w-full max-w-[min(100%,14rem)] object-contain drop-shadow-[0_8px_28px_rgba(92,64,51,0.22)] sm:max-w-[16rem]"
        priority
      />
    </div>
  );
}
