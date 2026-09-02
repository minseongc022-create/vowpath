import type { CatalogItem, Plan, PlanItem } from "./types";
import { getCatalogItem } from "./catalog";
import { NEED_LABEL, NEED_VERB } from "./plan-engine";
import { priceFor } from "./recommend";

/**
 * 화면에 내려보내는 모양.
 *
 * Plan은 catalogId만 들고 있다(저장소가 가벼워야 하고, 카탈로그가 바뀌어도
 * 저장된 계획이 깨지면 안 되니까). 화면은 이름·가격·주소가 다 필요하므로
 * 응답을 만들 때 여기서 한 번 살을 붙인다. 클라이언트가 카탈로그 전체를
 * 내려받을 필요가 없어진다.
 */

export type PlanItemView = PlanItem & {
  label: string;
  verb: string;
  catalog: CatalogItem | null;
  alternatives: (CatalogItem & { priceForPlan: number })[];
  replaced: CatalogItem | null;
};

export type PlanView = Omit<Plan, "items"> & {
  items: PlanItemView[];
  /** 사용자가 말한 예산 대비 남은 금액 (음수면 초과) */
  budgetLeftKrw: number;
};

export function toItemView(item: PlanItem, headcount: number): PlanItemView {
  return {
    ...item,
    label: NEED_LABEL[item.need],
    verb: NEED_VERB[item.need],
    catalog: getCatalogItem(item.catalogId),
    alternatives: item.alternativeIds
      .map((id) => getCatalogItem(id))
      .filter((candidate): candidate is CatalogItem => Boolean(candidate))
      .map((candidate) => ({ ...candidate, priceForPlan: priceFor(candidate, headcount) })),
    replaced: item.replacedCatalogId ? getCatalogItem(item.replacedCatalogId) : null,
  };
}

export function toPlanView(plan: Plan): PlanView {
  return {
    ...plan,
    items: plan.items.map((item) => toItemView(item, plan.brief.headcount)),
    budgetLeftKrw: plan.brief.budgetKrw - plan.totalKrw,
  };
}
