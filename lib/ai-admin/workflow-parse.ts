import type { UiLocale } from "../locale";
import { runtimeUiLocale } from "../locale";
import type { AiAdminAnalysisResult, AiAdminExecutableAction } from "./types";
import { workflowRulePreviewRows } from "../workflow-rules/format";
import type { WorkflowAction, WorkflowCondition, WorkflowRuleDraft } from "../workflow-rules/types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function previewFromDraft(
  draft: WorkflowRuleDraft,
  locale: UiLocale,
): AiAdminAnalysisResult {
  const rows = workflowRulePreviewRows(draft, locale);
  const action: AiAdminExecutableAction = {
    type: "create_workflow_rule",
    rule: draft,
  };
  const message =
    locale === "ko"
      ? "다음 운영 규칙을 생성합니다."
      : "The following automation rule will be created.";
  return {
    kind: "preview",
    answer: message,
    preview: {
      id: crypto.randomUUID(),
      title: draft.name,
      message,
      risk: "medium",
      confirmLabel: locale === "ko" ? "생성" : "Create",
      cancelLabel: locale === "ko" ? "취소" : "Cancel",
      rows,
      action,
    },
    suggestions:
      locale === "ko"
        ? ["운영 규칙 목록 보여줘", "Gas Smell은 무조건 긴급 처리", "주말 예약은 승인 필요"]
        : ["Show automation rules", "Gas smell is always urgent", "Weekend bookings need approval"],
  };
}

function hasAutoApproveIntent(q: string): boolean {
  return (
    q.includes("auto approve") ||
    q.includes("automatically approve") ||
    q.includes("자동 승인") ||
    q.includes("자동으로 승인") ||
    q.includes("승인 없이")
  );
}

function hasManualApprovalIntent(q: string): boolean {
  return (
    q.includes("manual approval") ||
    q.includes("require approval") ||
    q.includes("승인 필요") ||
    q.includes("수동 승인") ||
    q.includes("무조건 승인")
  );
}

function hasUrgentIntent(q: string): boolean {
  return (
    q.includes("urgent") ||
    q.includes("emergency") ||
    q.includes("긴급") ||
    q.includes("무조건 긴급")
  );
}

function extractIssuePhrase(query: string, q: string): string | null {
  const patterns = [
    /(?:issue|이슈)\s*(?:=|:)?\s*([a-z0-9\s-]{2,40})/i,
    /(no cooling|no heat|gas smell|water leak)/i,
    /(노쿨링|냉방\s*안|가스\s*냄새|난방\s*안)/i,
    /^([a-z][a-z\s-]{2,30})\s+(?:은|는|을|를)?\s*(?:자동|승인|긴급)/i,
    /([a-z][a-z\s-]{2,30})\s+(?:auto|manual|urgent)/i,
  ];
  for (const pattern of patterns) {
    const m = query.match(pattern);
    const raw = m?.[1]?.trim();
    if (raw && raw.length >= 3) return raw;
  }
  if (q.includes("no cooling") || q.includes("노쿨링") || q.includes("냉방")) return "No Cooling";
  if (q.includes("gas smell") || q.includes("가스")) return "Gas Smell";
  if (q.includes("no heat") || q.includes("난방")) return "No Heat";
  if (q.includes("water leak") || q.includes("누수")) return "Water Leak";
  return null;
}

function buildIssueRule(
  issue: string,
  actions: WorkflowAction[],
  locale: UiLocale,
): WorkflowRuleDraft {
  const condition: WorkflowCondition = { type: "issue_contains", value: issue };
  const name =
    locale === "ko"
      ? `${issue} 운영 규칙`
      : `${issue} Automation Rule`;
  return {
    name,
    description: locale === "ko" ? `이슈 "${issue}"에 적용` : `Applies when issue contains "${issue}"`,
    enabled: true,
    priority: hasUrgentIntent(normalize(issue)) ? 5 : 20,
    source: "ai_chat",
    conditions: [condition],
    actions,
  };
}

export function analyzeWorkflowIntent(
  query: string,
  locale: UiLocale = runtimeUiLocale(),
): AiAdminAnalysisResult | null {
  const q = normalize(query);
  const wantsRule =
    hasAutoApproveIntent(q) ||
    hasManualApprovalIntent(q) ||
    hasUrgentIntent(q) ||
    q.includes("weekend") ||
    q.includes("주말") ||
    q.includes("after hours") ||
    q.includes("영업시간 외") ||
    q.includes("automation rule") ||
    q.includes("workflow rule") ||
    q.includes("운영 규칙") ||
    q.includes("자동화 규칙");

  if (!wantsRule && !extractIssuePhrase(query, q)) return null;

  if (q.includes("weekend") || q.includes("주말")) {
    const draft: WorkflowRuleDraft = {
      name: locale === "ko" ? "주말 수동 승인" : "Weekend Manual Approval",
      description:
        locale === "ko" ? "토·일 예약은 승인이 필요합니다." : "Saturday and Sunday bookings need approval.",
      enabled: true,
      priority: 30,
      source: "ai_chat",
      conditions: [{ type: "booking_day_in", days: ["sat", "sun"] }],
      actions: [{ type: "require_manual_approval" }],
    };
    return previewFromDraft(draft, locale);
  }

  if (q.includes("after hours") || q.includes("영업시간 외") || q.includes("야간")) {
    const draft: WorkflowRuleDraft = {
      name: locale === "ko" ? "영업시간 외 승인 필요" : "After-Hours Manual Approval",
      enabled: true,
      priority: 25,
      source: "ai_chat",
      conditions: [{ type: "after_hours", value: true }],
      actions: [{ type: "require_manual_approval" }, { type: "send_owner_sms" }],
    };
    return previewFromDraft(draft, locale);
  }

  const issue = extractIssuePhrase(query, q);
  if (issue) {
    const actions: WorkflowAction[] = [];
    if (hasUrgentIntent(q) || q.includes("gas smell") || q.includes("가스")) {
      actions.push({ type: "set_priority", value: "P1" });
      actions.push({ type: "require_manual_approval" });
      actions.push({ type: "send_owner_sms" });
    } else if (hasAutoApproveIntent(q)) {
      actions.push({ type: "auto_approve" });
    } else if (hasManualApprovalIntent(q)) {
      actions.push({ type: "require_manual_approval" });
    } else if (hasUrgentIntent(q)) {
      actions.push({ type: "set_priority", value: "P1" });
    }

    if (!actions.length) return null;
    return previewFromDraft(buildIssueRule(issue, actions, locale), locale);
  }

  if (q.includes("show") && (q.includes("rule") || q.includes("automation") || q.includes("규칙"))) {
    return null;
  }

  return null;
}

export async function analyzeWorkflowIntentAsync(
  query: string,
  locale: UiLocale = runtimeUiLocale(),
): Promise<AiAdminAnalysisResult | null> {
  const keyword = analyzeWorkflowIntent(query, locale);
  if (keyword) return keyword;

  const q = normalize(query);
  const looksLikeRule =
    q.includes("approve") ||
    q.includes("승인") ||
    q.includes("urgent") ||
    q.includes("긴급") ||
    q.includes("weekend") ||
    q.includes("주말") ||
    q.includes("rule") ||
    q.includes("규칙");
  if (!looksLikeRule || q.length < 12) return null;

  const { parseWorkflowRuleWithLlm } = await import("../workflow-rules/llm-parse");
  const llmDraft = await parseWorkflowRuleWithLlm(query, locale);
  if (llmDraft) return previewFromDraft(llmDraft, locale);
  return null;
}

export function isWorkflowMutationQuery(query: string): boolean {
  const q = normalize(query);
  return (
    analyzeWorkflowIntent(query) !== null ||
    q.includes("automation rule") ||
    q.includes("workflow rule") ||
    q.includes("운영 규칙") ||
    q.includes("자동 승인") ||
    q.includes("auto approve") ||
    ((q.includes("weekend") || q.includes("주말")) &&
      (q.includes("approval") || q.includes("승인")))
  );
}
