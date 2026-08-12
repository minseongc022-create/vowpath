/** Standalone Learn product brand — not Effiroad dispatch. Domain-swappable later. */

export const LEARN_BRAND = {
  name: process.env.NEXT_PUBLIC_LEARN_BRAND_NAME ?? "Lane",
  tagline: process.env.NEXT_PUBLIC_LEARN_TAGLINE ?? "영상 넣고 바로 학습",
  productId: "lane-learn",
} as const;

export function learnPageTitle(page?: string): string {
  return page ? `${page} · ${LEARN_BRAND.name}` : LEARN_BRAND.name;
}
