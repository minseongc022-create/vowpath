import type { GiuBox } from "@/giu/lib/types";
import type { GiuLocale } from "@/giu/lib/i18n";
import { t } from "@/giu/lib/i18n";

export type ProductListFilter = "all" | "selling" | "cancelled";
export type HistoryListFilter = "all" | "cancelled";

/** Cancelled listings stay in “등록된 상품” for 12 hours. */
export const CANCELLED_LIST_TTL_MS = 12 * 60 * 60 * 1000;

export function cancelledAtMs(box: GiuBox): number {
  if (box.cancelledAt) return new Date(box.cancelledAt).getTime();
  return new Date(box.createdAt).getTime();
}

export function isCancelledVisibleInRegisteredList(box: GiuBox, now = Date.now()): boolean {
  if (box.status !== "huy") return false;
  return now - cancelledAtMs(box) < CANCELLED_LIST_TTL_MS;
}

export function registeredListBoxes(boxes: GiuBox[], now = Date.now()): GiuBox[] {
  return boxes.filter(
    (b) => b.status !== "huy" || isCancelledVisibleInRegisteredList(b, now),
  );
}

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

export function filterBoxes(boxes: GiuBox[], filter: ProductListFilter, now = Date.now()): GiuBox[] {
  let list = registeredListBoxes(boxes, now);
  if (filter === "selling") list = list.filter((b) => b.status === "mo");
  if (filter === "cancelled") list = list.filter((b) => b.status === "huy");
  return sortBoxesForList(list);
}

export function filterHistoryBoxes(boxes: GiuBox[], filter: HistoryListFilter): GiuBox[] {
  let list = boxes;
  if (filter === "cancelled") list = boxes.filter((b) => b.status === "huy");
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function productFilterLabel(locale: GiuLocale, filter: ProductListFilter): string {
  if (filter === "selling") return t(locale, "mFilterSelling");
  if (filter === "cancelled") return t(locale, "mFilterCancelled");
  return t(locale, "mFilterAll");
}

export function historyFilterLabel(locale: GiuLocale, filter: HistoryListFilter): string {
  if (filter === "cancelled") return t(locale, "mHistoryCancelled");
  return t(locale, "mHistoryAll");
}
