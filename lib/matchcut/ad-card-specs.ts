/**
 * Marketing ad-card styles inspired by top Korean PDP/ad tools (Creazy-class):
 * concept-driven creatives for ads & social — NOT marketplace upload specs.
 */
export type AdCardStyleId =
  | "benefit_hero"
  | "lifestyle_mood"
  | "editorial_premium"
  | "social_proof"
  | "promo_burst";

export type AdCardStyle = {
  id: AdCardStyleId;
  label: string;
  description: string;
  /** Visual direction for the image model */
  artDirection: string;
};

export const AD_CARD_STYLES: AdCardStyle[] = [
  {
    id: "benefit_hero",
    label: "혜택 히어로",
    description: "핵심 베네핏 한 줄 + 상품 클로즈업 — 검색·피드용 기본 카드",
    artDirection:
      "Clean white-to-soft-gradient studio. Product large and centered. Bold Korean benefit headline top or bottom third. Minimal secondary line. High conversion marketplace ad look used by top Korean sellers.",
  },
  {
    id: "lifestyle_mood",
    label: "라이프스타일",
    description: "사용 장면·분위기 — 감성 구매 유도",
    artDirection:
      "Aspirational lifestyle scene that fits the product category. Soft natural light, shallow depth of field. Product clearly visible and exact. Short elegant Korean mood copy. Magazine-quality, not stock-photo clutter.",
  },
  {
    id: "editorial_premium",
    label: "프리미엄 에디토리얼",
    description: "고급 브랜드 무드 — 여백·타이포 중심",
    artDirection:
      "Luxury editorial layout: generous negative space, refined typography, muted sophisticated palette matching category. Product hero shot with exact identity. Feels like a premium brand campaign, not discount mall spam.",
  },
  {
    id: "social_proof",
    label: "신뢰·후기형",
    description: "신뢰 문구·체크 포인트 — 망설임 제거",
    artDirection:
      "Trust-first ad card: product on clean backdrop, 2–3 short Korean proof points (quality check, easy use, gift-ready) as elegant text rows. No fake star ratings or fake review names. Professional and credible.",
  },
  {
    id: "promo_burst",
    label: "프로모션 강조",
    description: "지금 사야 하는 이유 — 이벤트·런칭 톤",
    artDirection:
      "Energetic but still premium promo card. Strong focal product, accent color ribbon or corner badge with short Korean promo line. Avoid cheap clipart explosions. Looks like a polished launch campaign.",
  },
];

export function adCardStyleById(id: string): AdCardStyle | undefined {
  return AD_CARD_STYLES.find((s) => s.id === id);
}
