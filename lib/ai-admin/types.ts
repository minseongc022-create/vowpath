import type { OwnerApprovalSms, SchedulingMode } from "../booking-settings";
import type { PlanId } from "../constants";
import type { CompanyAiMemoryInput } from "../company-ai-memory";
import type { WorkflowRuleDraft } from "../workflow-rules/types";

export type AiAdminRisk = "low" | "medium" | "high";

export type CompanyMemoryField = Exclude<
  keyof CompanyAiMemoryInput,
  "dailyBriefingSmsEnabled" | "dailyBriefingSmsTime"
>;

export type AiAdminExecutableAction =
  | {
      type: "set_daily_briefing_sms";
      enabled: boolean;
    }
  | {
      type: "set_daily_briefing_time";
      time: string;
    }
  | {
      type: "append_service_area";
      area: string;
    }
  | {
      type: "remove_service_area";
      area: string;
    }
  | {
      type: "set_company_memory_field";
      field: CompanyMemoryField;
      value: string;
    }
  | {
      type: "set_booking_mode";
      mode: SchedulingMode;
    }
  | {
      type: "set_owner_approval_sms";
      level: OwnerApprovalSms;
    }
  | {
      type: "set_ai_phone_answering";
      enabled: boolean;
    }
  | {
      type: "create_workflow_rule";
      rule: WorkflowRuleDraft;
    }
  | {
      type: "toggle_workflow_rule";
      ruleId: string;
      enabled: boolean;
    }
  | {
      type: "delete_workflow_rule";
      ruleId: string;
    }
  | { type: "delete_account" }
  | { type: "disconnect_jobber" }
  | { type: "update_owner_phone"; phone: string };

export type AiAdminPreview = {
  id: string;
  title: string;
  message: string;
  risk: AiAdminRisk;
  requiresPassword?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  rows?: { label: string; value: string }[];
  action: AiAdminExecutableAction;
};

export type AiAdminBillingAction = {
  label: string;
  href?: string;
  kind: "checkout" | "portal" | "compare";
};

export type AiAdminBillingCard = {
  title: string;
  description: string;
  rows?: { label: string; value: string }[];
  actions: AiAdminBillingAction[];
};

export type AiAdminAnalysisResult =
  | { kind: "none" }
  | {
      kind: "preview";
      answer: string;
      preview: AiAdminPreview;
      suggestions?: string[];
    }
  | {
      kind: "billing";
      answer: string;
      billingCard: AiAdminBillingCard;
      suggestions?: string[];
    }
  | {
      kind: "blocked";
      answer: string;
      rows?: { label: string; value: string }[];
      suggestions?: string[];
    };

export type AiAdminConfirmRequest = {
  action?: AiAdminExecutableAction;
  password?: string;
};

export type AiAdminExecutionResult = {
  message: string;
  rows?: { label: string; value: string }[];
};
