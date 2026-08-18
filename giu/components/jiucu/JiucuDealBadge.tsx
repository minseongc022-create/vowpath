import { t } from "@/giu/lib/i18n";
import type { GiuLocale } from "@/giu/lib/i18n";
import { JiucuImage } from "./JiucuImage";

type Props = {
  locale: GiuLocale;
  compact?: boolean;
  className?: string;
};

/** Product discovery badge — Jiucu found this deal today. */
export function JiucuDealBadge({ locale, compact, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-giu-ink/90 py-0.5 pl-1 pr-1.5 text-[9px] font-bold text-white ${className}`}
    >
      <JiucuImage variant="default" className="h-4 w-4 shrink-0 object-contain" />
      <span className={compact ? "max-w-[88px] truncate" : ""}>{t(locale, "dealBadge")}</span>
    </span>
  );
}
