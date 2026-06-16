import type { ShopBookingSettings } from "../booking-settings";
import type { RecentBooking } from "../recent-bookings";
import {
  evaluateWorkflowRules,
  resolveApprovalFromWorkflow,
} from "./evaluate";
import type { RuleEvaluationContext, WorkflowRule } from "./types";
import { shouldOwnerApproveAfterCustomerSlotPick } from "../booking-settings";

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
    schedulingMode: params.bookingSettings.schedulingMode,
    ...params.ctxExtras,
  };

  const baseNeedsApproval = shouldOwnerApproveAfterCustomerSlotPick({
    mode: params.bookingSettings.schedulingMode,
    priority: params.booking.priority,
    hybridAutoPriorities: params.bookingSettings.hybridAutoPriorities,
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
  limit?: number;
}): WorkflowSimulationResult[] {
  return params.bookings
    .slice(0, params.limit ?? 30)
    .map((booking) => simulateWorkflowForBooking({ ...params, booking }));
}
