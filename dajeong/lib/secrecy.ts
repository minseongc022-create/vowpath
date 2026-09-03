import { buildExperienceFlow } from "./experience";
import type { ConciergeMessage, DajeongPlan, PlanItem, PrepItem, ReservationOrder } from "./types";

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
    if (item.reality?.address) terms.add(item.reality.address);
  });
  (plan.prep ?? []).filter((item) => item.visibility !== "shared").forEach((item) => {
    if (item.title) terms.add(item.title);
    if (item.secretLabel) terms.add(item.secretLabel);
    if (item.notes) terms.add(item.notes);
  });
  return [...terms].filter((term) => term.length >= 2);
}

/**
 * Term-level scrub for free text (chat replies, revision summaries) that a non-owner might
 * receive. This is a defense-in-depth layer, not the primary boundary — redactPlanForViewer
 * (which drops secret records structurally) is what a companion's screen is actually built
 * from. Kept exported so API routes can sanitize generated NL messages too.
 */
export function scrub(text: string, terms: string[]): string {
  if (!terms.length) return text;
  let result = text;
  for (const term of terms) {
    if (result.includes(term)) result = result.split(term).join("그 일정");
  }
  return result;
}

export function sanitizeMessageForViewer(plan: DajeongPlan, viewerId: string | null | undefined, text: string): string {
  if (planAccessRole(plan, viewerId) !== "companion") return text;
  return scrub(text, secretTerms(plan));
}

function redactMessage(message: ConciergeMessage, terms: string[]): ConciergeMessage | null {
  if (message.visibility === "secret") return null;
  const text = scrub(message.text, terms);
  return text === message.text ? message : { ...message, text };
}

function redactExecution(order: ReservationOrder | undefined, hiddenItemIds: Set<string>): ReservationOrder | undefined {
  if (!order) return order;
  const tasks = order.tasks.filter((task) => !hiddenItemIds.has(task.itemId));
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
    requestedItemIds: order.requestedItemIds.filter((id) => !hiddenItemIds.has(id)),
    approval: order.approval && order.approval.taskIds.every((id) => visibleTaskIds.has(id)) ? order.approval : undefined,
  };
}

/** A secret item redacted to "time_only": keeps a blank timeline slot, strips every place fact. */
function toTimeOnly(item: PlanItem): PlanItem {
  return {
    ...item,
    title: "일정 있음",
    subtitle: "",
    location: "",
    reason: "",
    href: "",
    imageUrl: "",
    referenceImageUrl: undefined,
    imageAlt: "",
    notes: [],
    alternatives: [],
    reality: undefined,
    experience: undefined,
    price: 0,
    secretLabel: undefined,
    reservationRequired: false,
    badge: undefined,
  };
}

/** A secret item redacted to "label_only": a generic "서프라이즈 일정" chip, still no place facts. */
function toLabelOnly(item: PlanItem): PlanItem {
  return { ...toTimeOnly(item), title: "서프라이즈 일정" };
}

function redactPrepForCompanion(prep: PrepItem[] | undefined): PrepItem[] {
  return (prep ?? []).filter((item) => item.visibility === "shared");
}

/**
 * Non-owner viewers never see secret items at full fidelity, secret-tagged chat, or
 * execution/price details tied to a secret item or secret prep — even indirectly through
 * warnings, the flow narrative, or totals. The scheduling engine itself must keep operating
 * on the unredacted plan; only this boundary function narrows what leaves the server toward
 * a companion. Disclosure level ("hidden" default, "time_only", "label_only") is the owner's
 * choice per item — never the reverse of hiding less by default.
 */
export function redactPlanForViewer(plan: DajeongPlan, viewerId: string | null | undefined): DajeongPlan | null {
  const role = planAccessRole(plan, viewerId);
  if (role === "none") return null;
  if (role === "owner") return plan;

  const secretItems = plan.items.filter(isSecretItem);
  const hiddenItemIds = new Set(secretItems.filter((item) => (item.secretDisclosure ?? "hidden") === "hidden").map((item) => item.id));
  // The execution view is a separate, more detailed surface than the timeline: even a "time_only"
  // or "label_only" secret item — which still shows a blank slot on the timeline — must not leak
  // its real venue/address/phone/price through the reservation task tied to it. So every secret
  // item's task is hidden here regardless of disclosure level, alongside every non-shared prep item.
  const executionHiddenItemIds = new Set([
    ...secretItems.map((item) => item.id),
    ...(plan.prep ?? []).filter((item) => item.visibility !== "shared").map((item) => item.id),
  ]);
  const terms = secretTerms(plan);
  const items = plan.items
    .filter((item) => !hiddenItemIds.has(item.id))
    .map((item) => {
      if (!isSecretItem(item)) return item;
      const disclosure = item.secretDisclosure ?? "hidden";
      return disclosure === "label_only" ? toLabelOnly(item) : toTimeOnly(item);
    });

  const subtotal = items.filter((item) => !isSecretItem(item)).reduce((sum, item) => sum + item.price, 0);
  const conversation = (plan.conversation ?? [])
    .map((message) => redactMessage(message, terms))
    .filter((message): message is ConciergeMessage => Boolean(message));

  return {
    ...plan,
    items,
    prep: redactPrepForCompanion(plan.prep),
    subtotal,
    total: subtotal,
    budgetRemaining: plan.budget - subtotal,
    conversation,
    execution: redactExecution(plan.execution, executionHiddenItemIds),
    experienceFlow: buildExperienceFlow(items.filter((item) => !isSecretItem(item))),
    changeLog: (plan.changeLog ?? []).map((entry) => ({ ...entry, summary: scrub(entry.summary, terms) })),
    schedule: plan.schedule
      ? { ...plan.schedule, warnings: plan.schedule.warnings.map((warning) => scrub(warning, terms)).filter((warning, index, all) => all.indexOf(warning) === index) }
      : plan.schedule,
    // Deliberately NOT annotated with "일부 일정은 비공개예요" or similar — even naming that
    // something is hidden tells a companion a secret exists. The timeline just ends where it
    // ends; that has to read as ordinary, not as a redacted document.
    notice: plan.notice,
  };
}

/** Item list an "explain" style answer should be composed from — full for the owner, exactly
 * what redactPlanForViewer would show otherwise, so the AI's prose can't describe more than
 * the screen it corresponds to. */
export function explainableItems(plan: DajeongPlan, viewerId: string | null | undefined): PlanItem[] {
  if (planAccessRole(plan, viewerId) !== "companion") return plan.items;
  return redactPlanForViewer(plan, viewerId)?.items ?? [];
}

export function hasSecretContent(plan: DajeongPlan): boolean {
  return plan.items.some(isSecretItem) || (plan.prep ?? []).some((item) => item.visibility !== "shared") || (plan.conversation ?? []).some((message) => message.visibility === "secret");
}
