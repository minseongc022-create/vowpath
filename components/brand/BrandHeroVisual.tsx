import { BrandMark } from "@/components/brand/BrandMark";

/** Hero / marketing — ER symbol with brand aura */
export function BrandHeroVisual() {
  return (
    <div className="relative flex flex-col items-center">
      <span
        className="vow-brand-aura pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 sm:h-72 sm:w-72"
        aria-hidden
      />
      <BrandMark placement="hero" priority className="relative z-10" />
    </div>
  );
}
