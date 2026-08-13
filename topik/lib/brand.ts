/** Standalone HanPro product — not Effiroad, not Lane Learn. */
export const TOPIK_BRAND = {
  name: process.env.NEXT_PUBLIC_TOPIK_BRAND_NAME ?? "HanPro",
  tagline: "Học tiếng Hàn thông minh · Đậu TOPIK nhanh hơn",
  productId: "hanpro-vn",
} as const;

export function topikPageTitle(page?: string): string {
  return page ? `${page} · ${TOPIK_BRAND.name}` : TOPIK_BRAND.name;
}
