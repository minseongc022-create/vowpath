import { SP_STRINGS } from "@/toss-shop/lib/strings";

export function LegalDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-ts-muted">
        {SP_STRINGS.legalShort}
      </p>
    );
  }
  return (
    <div className="rounded-2xl bg-ts-bg px-4 py-3 text-[11px] leading-relaxed text-ts-muted ring-1 ring-ts-border">
      <p className="font-semibold text-ts-ink">{SP_STRINGS.legalTitle}</p>
      <p className="mt-1">{SP_STRINGS.legalBody}</p>
    </div>
  );
}
