export const TOPIK_BRAND = {
  name: process.env.NEXT_PUBLIC_TOPIK_BRAND_NAME ?? "TOPIK Master VN",
  tagline: "Học tiếng Hàn · Chinh phục TOPIK",
  taglineEn: "Learn Korean · Pass TOPIK",
  productId: "topik-master-vn",
} as const;

export function topikPageTitle(page?: string): string {
  return page ? `${page} · ${TOPIK_BRAND.name}` : TOPIK_BRAND.name;
}
