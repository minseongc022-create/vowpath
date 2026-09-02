import { buildExperienceFlow } from "./experience";
import type { ConciergeMessage, DajeongPlan, PlanItem, ReservationOrder } from "./types";

export function isSecretItem(item: PlanItem): boolean {
  return item.visibility === "secret";
}

export function planAccessRole(plan: DajeongPlan, viewerId: string | null | undefined): "owner" | "companion" | "none" {
  if (!viewerId) return plan.planKind === "shared" ? "none" : "owner";
  if (!plan.ownerId || plan.ownerId === viewerId) return "owner";
  if (plan.planKind === "shared" && plan.companionId === viewerId) return "companion";
  return "none";
}

function secretTerms(plan: DajeongPlan): string[] {
  const terms = new Set<string>();
  plan.items.filter(isSecretItem).forEach((item) => {
    if (item.title) terms.add(item.title);
    if (item.secretLabel) terms.add(item.secretLabel);
    if (item.location) terms.add(item.location);
  });
  return [...terms].filter((term) => term.length >= 2);
}

function scrub(text: string, terms: string[]): string {
  if (!terms.length) return text;
  let result = text;
  for (const term of terms) {
    if (result.includes(term)) result = result.split(term).join("(비공개 일정)");
  }
  return result;
}

function redactMessage(message: ConciergeMessage, terms: string[]): ConciergeMessage | null {
  if (message.visibility === "secret") return null;
  const text = scrub(message.text, terms);
  return text === message.text ? message : { ...message, text };
}

function redactExecution(order: ReservationOrder | undefined, secretItemIds: Set<string>): ReservationOrder | undefined {
  if (!order) return order;
  const tasks = order.tasks.filter((task) => !secretItemIds.has(task.itemId));
  if (tasks.length === order.tasks.length) return order;
  const depositTotal = tasks.reduce((sum, task) => sum + (task.price.prepayAmount ?? 0), 0);
  const estimatedTotal = tasks.reduce((sum, task) => sum + (task.price.estimatedAmount ?? 0), 0);
  const onsiteEstimated = tasks.reduce((sum, task) => sum + (task.price.onsiteAmount ?? 0), 0);
  const payableNow = tasks.filter((task) => task.price.confidence === "provider_quote").reduce((sum, task) => sum + (task.price.prepayAmount ?? 0), 0);
  const visibleTaskIds = new Set(tasks.map((task) => task.id));
  return {
    ...order,
    tasks,
    depositTotal,
    estimatedTotal,
    onsiteEstimated,
    payableNow,
    unconfirmedPriceTaskIds: order.unconfirmedPriceTaskIds.filter((id) => visibleTaskIds.has(id)),
    requestedItemIds: order.requestedItemIds.filter((id) => !secretItemIds.has(id)),
    approval: order.approval && order.approval.taskIds.every((id) => visibleTaskIds.has(id)) ? order.approval : undefined,
  };
}

/**
 * Non-owner viewers never see secret items, secret-tagged chat, or execution/price
 * details tied to a secret item — even indirectly through warnings or the flow narrative.
 * The scheduling engine itself must keep operating on the unredacted plan; only this
 * boundary function narrows what leaves the server toward a companion.
 */
export function redactPlanForViewer(plan: DajeongPlan, viewerId: string | null | undefined): DajeongPlan | null {
  const role = planAccessRole(plan, viewerId);
  if (role === "none") return null;
  if (role === "owner") return plan;

  const secretItems = plan.items.filter(isSecretItem);
  const secretItemIds = new Set(secretItems.map((item) => item.id));
  const terms = secretTerms(plan);
  const items = plan.items
    .filter((item) => !isSecretItem(item))
    .map(({ secretLabel: _secretLabel, ...item }) => item);

  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const conversation = (plan.conversation ?? [])
    .map((message) => redactMessage(message, terms))
    .filter((message): message is ConciergeMessage => Boolean(message));

  return {
    ...plan,
    items,
    subtotal,
    total: subtotal,
    budgetRemaining: plan.budget - subtotal,
    conversation,
    execution: redactExecution(plan.execution, secretItemIds),
    experienceFlow: buildExperienceFlow(items),
    schedule: plan.schedule
      ? { ...plan.schedule, warnings: plan.schedule.warnings.map((warning) => scrub(warning, terms)).filter((warning, index, all) => all.indexOf(warning) === index) }
      : plan.schedule,
    changeLog: (plan.changeLog ?? []).map((entry) => ({ ...entry, summary: scrub(entry.summary, terms) })),
    notice: secretItems.length ? `${plan.notice} 일부 일정은 계획을 만든 사람이 비공개로 설정해 이 화면에는 표시하지 않았어요.` : plan.notice,
  };
}

export function hasSecretContent(plan: DajeongPlan): boolean {
  return plan.items.some(isSecretItem) || (plan.conversation ?? []).some((message) => message.visibility === "secret");
}
