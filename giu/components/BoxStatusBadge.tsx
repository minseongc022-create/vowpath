import { formatBoxStatusLocale } from "@/giu/lib/box-ux";
import type { GiuLocale } from "@/giu/lib/i18n";
import type { GiuBox } from "@/giu/lib/types";

export function BoxStatusBadge({ box, locale }: { box: GiuBox; locale: GiuLocale }) {
  const label = formatBoxStatusLocale(box.status, locale);
  if (box.status === "mo") {
    return <span className="giu-status-badge giu-status-selling">{label}</span>;
  }
  if (box.status === "huy") {
    return <span className="giu-status-badge giu-status-cancelled">{label}</span>;
  }
  return <span className="giu-status-badge giu-status-muted">{label}</span>;
}
