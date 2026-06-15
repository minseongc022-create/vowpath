import { extractZipFromAddress } from "../service-area";
import type {
  RuleEvaluationContext,
  WorkflowCondition,
  WorkflowDecision,
  WorkflowRule,
  Weekday,
} from "./types";

const WEEKDAY_INDEX: Record<Weekday, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function issueHaystack(ctx: RuleEvaluationContext): string {
  return normalizeText([ctx.issueType, ctx.symptom, ctx.transcript, ctx.aiSummary].filter(Boolean).join(" "));
}

function matchesCondition(condition: WorkflowCondition, ctx: RuleEvaluationContext): boolean {
  switch (condition.type) {
    case "issue_equals":
      return normalizeText(ctx.issueType) === normalizeText(condition.value);
    case "issue_contains":
      return issueHaystack(ctx).includes(normalizeText(condition.value));
    case "priority_is":
      return ctx.priority === condition.value;
    case "booking_day_in": {
      const iso = ctx.slotStartAt ?? ctx.createdAt;
      const day = new Date(iso).getDay();
      return condition.days.some((d) => WEEKDAY_INDEX[d] === day);
    }
    case "after_hours":
      return Boolean(ctx.afterHours) === condition.value;
    case "service_area_in": {
      const zip = ctx.zipCode ?? extractZipFromAddress(ctx.address ?? "");
      const city = normalizeText(ctx.cityState ?? "");
      const zipOk =
        !condition.zips?.length ||
        (zip ? condition.zips.some((z) => z.slice(0, 5) === zip.slice(0, 5)) : false);
      const cityOk =
        !condition.cities?.length ||
        condition.cities.some((c) => city.includes(normalizeText(c)));
      if (condition.zips?.length && condition.cities?.length) return zipOk || cityOk;
      if (condition.zips?.length) return zipOk;
      if (condition.cities?.length) return cityOk;
      return true;
    }
    case "confidence_below":
      return ctx.confidenceMin < condition.threshold;
    case "call_keyword": {
      const haystack = normalizeText(
        [ctx.transcript, ctx.symptom, ctx.aiSummary].filter(Boolean).join(" "),
      );
      return haystack.includes(normalizeText(condition.value));
    }
    case "ai_classification":
      return (
        normalizeText(ctx.issueType).includes(normalizeText(condition.label)) ||
        issueHaystack(ctx).includes(normalizeText(condition.label))
      );
    case "customer_type":
      return ctx.customerType === condition.value;
    case "jobber_client_exists":
      return Boolean(ctx.jobberClientExists) === condition.value;
    case "jobber_tag": {
      const tags = ctx.jobberTags ?? [];
      return tags.some((t) => normalizeText(t).includes(normalizeText(condition.value)));
    }
    default:
      return false;
  }
}

function ruleConditionsMatch(rule: WorkflowRule, ctx: RuleEvaluationContext): boolean {
  if (!rule.conditions.length) return false;
  const mode = rule.conditionMatch ?? "all";
  if (mode === "any") {
    return rule.conditions.some((c) => matchesCondition(c, ctx));
  }
  return rule.conditions.every((c) => matchesCondition(c, ctx));
}

function priorityRank(p: "P1" | "P2" | "P3"): number {
  if (p === "P1") return 3;
  if (p === "P2") return 2;
  return 1;
}

function applyActions(decision: WorkflowDecision, actions: WorkflowRule["actions"], rule: WorkflowRule) {
  decision.matchedRuleIds.push(rule.id);
  decision.audit.push({ ruleId: rule.id, name: rule.name });

  for (const action of actions) {
    switch (action.type) {
      case "auto_approve":
        decision.autoApprove = true;
        break;
      case "require_manual_approval":
        decision.requireManualApproval = true;
        break;
      case "set_priority":
        if (
          !decision.priorityOverride ||
          priorityRank(action.value) > priorityRank(decision.priorityOverride)
        ) {
          decision.priorityOverride = action.value;
        }
        break;
      case "send_owner_sms":
        decision.sendOwnerSms = true;
        break;
      case "skip_owner_sms":
        decision.sendOwnerSms = false;
        break;
      case "add_tag":
        if (!decision.tags.includes(action.value)) decision.tags.push(action.value);
        break;
      case "send_customer_sms":
        decision.sendCustomerSms = action.template;
        break;
      case "send_owner_email":
        decision.sendOwnerEmail = true;
        break;
      case "create_calendar_hold":
        decision.createCalendarHold = true;
        break;
      case "push_jobber_on_approve":
        decision.pushJobberOnApprove = true;
        break;
      default:
        break;
    }
  }
}

export function evaluateWorkflowRules(
  rules: WorkflowRule[],
  ctx: RuleEvaluationContext,
): WorkflowDecision {
  const decision: WorkflowDecision = {
    matchedRuleIds: [],
    autoApprove: null,
    requireManualApproval: null,
    priorityOverride: null,
    sendOwnerSms: null,
    sendCustomerSms: null,
    sendOwnerEmail: false,
    createCalendarHold: false,
    pushJobberOnApprove: false,
    tags: [],
    audit: [],
  };

  const active = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));

  for (const rule of active) {
    if (!ruleConditionsMatch(rule, ctx)) continue;
    applyActions(decision, rule.actions, rule);
  }

  if (decision.requireManualApproval) {
    decision.autoApprove = false;
  } else if (decision.autoApprove === true) {
    decision.requireManualApproval = false;
  }

  return decision;
}

export function resolveApprovalFromWorkflow(
  baseNeedsApproval: boolean,
  decision: WorkflowDecision,
): boolean {
  if (decision.requireManualApproval === true) return true;
  if (decision.autoApprove === true) return false;
  return baseNeedsApproval;
}
