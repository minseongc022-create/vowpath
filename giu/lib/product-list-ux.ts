import type { GiuBox } from "@/giu/lib/types";
import type { GiuLocale } from "@/giu/lib/i18n";
import { t } from "@/giu/lib/i18n";

export type ProductListFilter = "all" | "selling" | "cancelled";

export function boxSortRank(box: GiuBox): number {
  if (box.status === "mo") return box.quantityLeft > 0 ? 0 : 1;
  if (box.status === "het") return 2;
  if (box.status === "huy") return 3;
  return 4;
}

export function sortBoxesForList(boxes: GiuBox[]): GiuBox[] {
  return [...boxes].sort((a, b) => {
    const rank = boxSortRank(a) - boxSortRank(b);
    if (rank !== 0) return rank;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterBoxes(boxes: GiuBox[], filter: ProductListFilter): GiuBox[] {
  let list = boxes;
  if (filter === "selling") list = boxes.filter((b) => b.status === "mo");
  if (filter === "cancelled") list = boxes.filter((b) => b.status === "huy");
  return sortBoxesForList(list);
}

export function productFilterLabel(locale: GiuLocale, filter: ProductListFilter): string {
  if (filter === "selling") return t(locale, "mFilterSelling");
  if (filter === "cancelled") return t(locale, "mFilterCancelled");
  return t(locale, "mFilterAll");
}
