import type { LossCategory } from "./loss-category";

export const LOSS_CATEGORY_LABELS: Record<LossCategory, string> = {
  water: "Water loss",
  fire: "Fire / smoke",
  mold: "Mold",
  sewage_cat3: "Sewage / Cat-3",
  commercial: "Commercial loss",
  inspection: "Inspection / follow-up",
  other: "Other",
};
