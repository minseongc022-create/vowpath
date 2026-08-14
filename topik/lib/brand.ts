/** TOPIK Master — locale-aware branding */
import { l } from "@/topik/lib/i18n/locale-text";

export const TOPIK_BRAND = {
  name: process.env.NEXT_PUBLIC_TOPIK_BRAND_NAME ?? l("TOPIK Master VN", "TOPIK Master"),
  tagline: l("Học tiếng Hàn · Chinh phục TOPIK", "한국어 학습 · TOPIK 정복"),
  taglineEn: "Learn Korean · Pass TOPIK",
  productId: "topik-master-vn",
} as const;

export function topikPageTitle(page?: string): string {
  return page ? `${page} · ${TOPIK_BRAND.name}` : TOPIK_BRAND.name;
}
