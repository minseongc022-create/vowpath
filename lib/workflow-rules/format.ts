import type { UiLocale } from "../locale";
import type { WorkflowAction, WorkflowCondition, WorkflowRule } from "./types";

const DAY_LABELS: Record<string, { en: string; ko: string }> = {
  sun: { en: "Sunday", ko: "일요일" },
  mon: { en: "Monday", ko: "월요일" },
  tue: { en: "Tuesday", ko: "화요일" },
  wed: { en: "Wednesday", ko: "수요일" },
  thu: { en: "Thursday", ko: "목요일" },
  fri: { en: "Friday", ko: "금요일" },
  sat: { en: "Saturday", ko: "토요일" },
};

function formatCondition(condition: WorkflowCondition, _locale: UiLocale): string {
  switch (condition.type) {
    case "issue_equals":
      return `Issue = ${condition.value}`;
    case "issue_contains":
      return `Issue contains "${condition.value}"`;
    case "priority_is":
      return `Priority = ${condition.value}`;
    case "booking_day_in": {
      const days = condition.days
        .map((d) => DAY_LABELS[d]?.en ?? d)
        .join(" or ");
      return `Booking Day = ${days}`;
    }
    case "after_hours":
      return condition.value ? "After Hours" : "Business Hours";
    case "service_area_in": {
      const parts = [
        ...(condition.zips?.length ? [`ZIP ${condition.zips.join(", ")}`] : []),
        ...(condition.cities?.length ? [condition.cities.join(", ")] : []),
      ];
      return `Service Area = ${parts.join(" · ")}`;
    }
    case "confidence_below":
      return `AI Confidence < ${condition.threshold}%`;
    case "call_keyword":
      return `Call Keyword = "${condition.value}"`;
    case "ai_classification":
      return `AI Classification = ${condition.label}`;
    case "customer_type":
      return `Customer Type = ${condition.value}`;
    case "jobber_client_exists":
      return `Jobber Client ${condition.value ? "exists" : "missing"}`;
    case "jobber_tag":
      return `Jobber Tag = ${condition.value}`;
    default:
      return "";
  }
}

function formatAction(action: WorkflowAction, _locale: UiLocale): string {
  switch (action.type) {
    case "auto_approve":
      return "Auto Approve";
    case "require_manual_approval":
      return "Manual Approval";
    case "set_priority":
      return `Priority = ${action.value}`;
    case "send_owner_sms":
      return "Send Owner SMS";
    case "skip_owner_sms":
      return "Skip Owner SMS";
    case "add_tag":
      return `Add Tag: ${action.value}`;
    case "send_customer_sms":
      return `Customer SMS (${action.template})`;
    case "send_owner_email":
      return "Owner Email";
    case "create_calendar_hold":
      return "Calendar Hold";
    case "push_jobber_on_approve":
      return "Create Jobber Request";
    default:
      return "";
  }
}

export function summarizeWorkflowRule(rule: WorkflowRule, locale: UiLocale = "en"): string {
  const ifPart = rule.conditions.map((c) => formatCondition(c, locale)).join(" · ");
  const thenPart = rule.actions.map((a) => formatAction(a, locale)).join(" · ");
  return `IF ${ifPart} → THEN ${thenPart}`;
}

export function workflowRulePreviewRows(
  rule: Pick<WorkflowRule, "conditions" | "actions">,
  locale: UiLocale = "en",
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  rule.conditions.forEach((c, i) => {
    rows.push({
      label: `Condition ${i + 1}`,
      value: formatCondition(c, locale),
    });
  });
  rule.actions.forEach((a, i) => {
    rows.push({
      label: `Action ${i + 1}`,
      value: formatAction(a, locale),
    });
  });
  return rows;
}

export { formatCondition, formatAction };
