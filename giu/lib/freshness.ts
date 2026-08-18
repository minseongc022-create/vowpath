import type { GiuLocale } from "./i18n";
import { t } from "./i18n";
import type { GiuBox, GiuStorageMethod } from "./types";

export const GIU_STORAGE_METHODS: GiuStorageMethod[] = [
  "room",
  "fridge",
  "freezer",
  "display",
  "other",
];

export function storageMethodLabel(method: GiuStorageMethod, locale: GiuLocale): string {
  const key = `storage${method.charAt(0).toUpperCase()}${method.slice(1)}` as
    | "storageRoom"
    | "storageFridge"
    | "storageFreezer"
    | "storageDisplay"
    | "storageOther";
  return t(locale, key);
}

export function formatMadeAt(iso: string, locale: GiuLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatBestBefore(iso: string, locale: GiuLocale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildMadeAtIso(date: string, hour: number): string {
  const [y, m, day] = date.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, day ?? 1, hour, 0, 0, 0);
  return d.toISOString();
}

export function parseMadeAtParts(iso?: string): { date: string; hour: number } {
  if (!iso) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      hour: now.getHours(),
    };
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return { date: now.toISOString().slice(0, 10), hour: now.getHours() };
  }
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date, hour: d.getHours() };
}

export function boxHasFreshnessTrust(box: GiuBox): boolean {
  return Boolean(box.madeAt && box.storageMethod);
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("82")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+82${digits.slice(1)}`;
  return `tel:${digits}`;
}
