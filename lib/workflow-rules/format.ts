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

function formatCondition(condition: WorkflowCondition, locale: UiLocale): string {
  const ko = locale === "ko";
  switch (condition.type) {
    case "issue_equals":
      return ko ? `이슈 = ${condition.value}` : `Issue = ${condition.value}`;
    case "issue_contains":
      return ko
        ? `이슈에 "${condition.value}" 포함`
        : `Issue contains "${condition.value}"`;
    case "priority_is":
      return ko ? `긴급도 = ${condition.value}` : `Priority = ${condition.value}`;
    case "booking_day_in": {
      const days = condition.days
        .map((d) => (ko ? DAY_LABELS[d]?.ko : DAY_LABELS[d]?.en) ?? d)
        .join(ko ? " 또는 " : " or ");
      return ko ? `예약 요일 = ${days}` : `Booking Day = ${days}`;
    }
    case "after_hours":
      return ko
        ? condition.value
          ? "영업시간 외"
          : "영업시간 내"
        : condition.value
          ? "After Hours"
          : "Business Hours";
    case "service_area_in": {
      const parts = [
        ...(condition.zips?.length ? [`ZIP ${condition.zips.join(", ")}`] : []),
        ...(condition.cities?.length ? [condition.cities.join(", ")] : []),
      ];
      return ko ? `서비스 지역 = ${parts.join(" · ")}` : `Service Area = ${parts.join(" · ")}`;
    }
    case "confidence_below":
      return ko
        ? `AI 신뢰도 < ${condition.threshold}%`
        : `AI Confidence < ${condition.threshold}%`;
    case "call_keyword":
      return ko
        ? `통화 키워드 = "${condition.value}"`
        : `Call Keyword = "${condition.value}"`;
    case "ai_classification":
      return ko
        ? `AI 분류 = ${condition.label}`
        : `AI Classification = ${condition.label}`;
    case "customer_type":
      return ko
        ? `고객 유형 = ${condition.value === "new" ? "신규" : "재방문"}`
        : `Customer Type = ${condition.value}`;
    case "jobber_client_exists":
      return ko
        ? `Jobber 고객 ${condition.value ? "있음" : "없음"}`
        : `Jobber Client ${condition.value ? "exists" : "missing"}`;
    case "jobber_tag":
      return ko ? `Jobber 태그 = ${condition.value}` : `Jobber Tag = ${condition.value}`;
    default:
      return "";
  }
}

function formatAction(action: WorkflowAction, locale: UiLocale): string {
  const ko = locale === "ko";
  switch (action.type) {
    case "auto_approve":
      return ko ? "자동 승인" : "Auto Approve";
    case "require_manual_approval":
      return ko ? "수동 승인 필요" : "Manual Approval";
    case "set_priority":
      return ko ? `긴급도 = ${action.value}` : `Priority = ${action.value}`;
    case "send_owner_sms":
      return ko ? "업주 SMS 발송" : "Send Owner SMS";
    case "skip_owner_sms":
      return ko ? "업주 SMS 생략" : "Skip Owner SMS";
    case "add_tag":
      return ko ? `태그 추가: ${action.value}` : `Add Tag: ${action.value}`;
    case "send_customer_sms":
      return ko ? `고객 SMS (${action.template})` : `Customer SMS (${action.template})`;
    case "send_owner_email":
      return ko ? "업주 이메일" : "Owner Email";
    case "create_calendar_hold":
      return ko ? "캘린더 확정" : "Calendar Hold";
    case "push_jobber_on_approve":
      return ko ? "Jobber 생성" : "Create Jobber Request";
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
      label: locale === "ko" ? `조건 ${i + 1}` : `Condition ${i + 1}`,
      value: formatCondition(c, locale),
    });
  });
  rule.actions.forEach((a, i) => {
    rows.push({
      label: locale === "ko" ? `동작 ${i + 1}` : `Action ${i + 1}`,
      value: formatAction(a, locale),
    });
  });
  return rows;
}

export { formatCondition, formatAction };
