import type { ShopBookingSettings } from "../booking-settings";
import type { RecentBooking } from "../recent-bookings";
import {
  evaluateWorkflowRules,
  resolveApprovalFromWorkflow,
} from "./evaluate";
import type { RuleEvaluationContext, WorkflowRule } from "./types";
import { shouldOwnerApproveAfterCustomerSlotPickForVertical } from "../booking-settings";
import type { ShopVertical } from "../shop-vertical";

export type WorkflowSimulationResult = {
  bookingId: string;
  issueType: string;
  matchedRules: string[];
  baseNeedsApproval: boolean;
  finalNeedsApproval: boolean;
  priority: "P1" | "P2" | "P3";
  summary: string;
};

export function simulateWorkflowForBooking(params: {
  rules: WorkflowRule[];
  booking: RecentBooking;
  bookingSettings: ShopBookingSettings;
  vertical?: ShopVertical;
  ctxExtras?: Partial<RuleEvaluationContext>;
}): WorkflowSimulationResult {
  const ctx: RuleEvaluationContext = {
    userId: "",
    bookingId: params.booking.id,
    issueType: params.booking.issueType,
    symptom: params.booking.issueType,
    priority: params.booking.priority,
    confidenceMin: 85,
    address: params.booking.address,
    cityState: params.booking.cityState,
    createdAt: params.booking.createdAt,
    schedulingMode: "auto",
    ...params.ctxExtras,
  };

  const vertical = params.vertical ?? "restoration";
  const baseNeedsApproval = shouldOwnerApproveAfterCustomerSlotPickForVertical(vertical, {
    priority: params.booking.priority,
    issueType: params.booking.issueType,
    symptom: params.booking.issueType,
  });

  const decision = evaluateWorkflowRules(params.rules, ctx);
  const finalNeedsApproval = resolveApprovalFromWorkflow(baseNeedsApproval, decision);
  const priority = decision.priorityOverride ?? params.booking.priority;

  const parts: string[] = [];
  if (decision.matchedRuleIds.length) {
    parts.push(`Matched ${decision.matchedRuleIds.length} rule(s)`);
  } else {
    parts.push("No rules matched");
  }
  parts.push(finalNeedsApproval ? "Would need approval" : "Would auto-schedule");
  if (priority !== params.booking.priority) {
    parts.push(`Priority ${params.booking.priority} → ${priority}`);
  }

  return {
    bookingId: params.booking.id,
    issueType: params.booking.issueType,
    matchedRules: decision.audit.map((a) => a.name),
    baseNeedsApproval,
    finalNeedsApproval,
    priority,
    summary: parts.join(" · "),
  };
}

export function simulateWorkflowBatch(params: {
  rules: WorkflowRule[];
  bookings: RecentBooking[];
  bookingSettings: ShopBookingSettings;
  vertical?: ShopVertical;
  limit?: number;
}): WorkflowSimulationResult[] {
  return params.bookings
    .slice(0, params.limit ?? 30)
    .map((booking) => simulateWorkflowForBooking({ ...params, booking }));
}
