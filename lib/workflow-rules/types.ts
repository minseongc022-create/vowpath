import type { SchedulingMode } from "../booking-settings";
import type { JobPriority } from "../types";

export type WorkflowRuleSource = "manual" | "ai_chat" | "ai_suggestion";

export type Weekday =
  | "sun"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat";

export type ConditionMatchMode = "all" | "any";

export type WorkflowCondition =
  | { type: "issue_equals"; value: string }
  | { type: "issue_contains"; value: string }
  | { type: "priority_is"; value: JobPriority }
  | { type: "booking_day_in"; days: Weekday[] }
  | { type: "after_hours"; value: boolean }
  | { type: "service_area_in"; zips?: string[]; cities?: string[] }
  | { type: "confidence_below"; threshold: number }
  | { type: "call_keyword"; value: string }
  | { type: "ai_classification"; label: string }
  | { type: "customer_type"; value: "new" | "returning" }
  | { type: "jobber_client_exists"; value: boolean }
  | { type: "jobber_tag"; value: string };

export type WorkflowAction =
  | { type: "auto_approve" }
  | { type: "require_manual_approval" }
  | { type: "set_priority"; value: JobPriority }
  | { type: "send_owner_sms" }
  | { type: "skip_owner_sms" }
  | { type: "add_tag"; value: string }
  | { type: "send_customer_sms"; template: "scheduled" | "pending" }
  | { type: "send_owner_email" }
  | { type: "create_calendar_hold" }
  | { type: "push_jobber_on_approve" };

export type WorkflowRule = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  source: WorkflowRuleSource;
  conditionMatch?: ConditionMatchMode;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastMatchedAt?: string;
  matchCount?: number;
};

export type WorkflowRuleDraft = Omit<
  WorkflowRule,
  "id" | "createdAt" | "updatedAt" | "lastMatchedAt" | "matchCount"
> & {
  id?: string;
};

export type WorkflowRulesDocument = {
  userId: string;
  rules: WorkflowRule[];
  updatedAt: string;
};

export type RuleEvaluationContext = {
  userId: string;
  bookingId: string;
  callLogId?: string;
  issueType: string;
  symptom: string;
  priority: JobPriority;
  confidenceMin: number;
  customerPhone?: string;
  address?: string;
  zipCode?: string;
  cityState?: string;
  slotStartAt?: string;
  slotEndAt?: string;
  createdAt: string;
  transcript?: string;
  aiSummary?: string;
  schedulingMode: SchedulingMode;
  afterHours?: boolean;
  customerType?: "new" | "returning";
  jobberClientExists?: boolean;
  jobberTags?: string[];
};

export type WorkflowDecision = {
  matchedRuleIds: string[];
  autoApprove: boolean | null;
  requireManualApproval: boolean | null;
  priorityOverride: JobPriority | null;
  sendOwnerSms: boolean | null;
  sendCustomerSms: "scheduled" | "pending" | null;
  sendOwnerEmail: boolean;
  createCalendarHold: boolean;
  pushJobberOnApprove: boolean;
  tags: string[];
  audit: { ruleId: string; name: string }[];
};

export const MAX_WORKFLOW_RULES = 50;
