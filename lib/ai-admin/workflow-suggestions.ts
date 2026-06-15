import {
  isApprovedBooking,
  isPendingShopReview,
  normalizeRequestStatus,
} from "../booking-policy";
import type { UiLocale } from "../locale";
import type { AiContextPack } from "./context-pack";
import type { AiAdminAnalysisResult } from "./types";
import { listWorkflowRules } from "../workflow-rules/store";
import type { WorkflowAction, WorkflowCondition, WorkflowRuleDraft } from "../workflow-rules/types";

const APPROVAL_RATE_THRESHOLD = 0.9;
const MIN_SAMPLE_SIZE = 5;
const LOOKBACK_DAYS = 30;

function issueKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasSimilarRule(
  rules: Awaited<ReturnType<typeof listWorkflowRules>>,
  issue: string,
  actionType: WorkflowAction["type"],
): boolean {
  const key = issueKey(issue);
  return rules.some(
    (rule) =>
      rule.enabled &&
      rule.conditions.some(
        (c) =>
          (c.type === "issue_equals" || c.type === "issue_contains") &&
          issueKey(c.value).includes(key),
      ) &&
      rule.actions.some((a) => a.type === actionType),
  );
}

export async function buildWorkflowSuggestion(
  pack: AiContextPack,
): Promise<AiAdminAnalysisResult | null> {
  const locale = pack.locale;
  const cutoff = new Date(pack.now);
  cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

  const byIssue = new Map<string, { total: number; approved: number }>();

  for (const booking of pack.bookings) {
    if (new Date(booking.createdAt) < cutoff) continue;
    const issue = booking.issueType?.trim();
    if (!issue || issue === "—") continue;
    const status = normalizeRequestStatus(
      pack.requestStatuses[booking.id] ?? booking.status,
    );
    const key = issueKey(issue);
    const row = byIssue.get(key) ?? { total: 0, approved: 0 };
    row.total += 1;
    if (isApprovedBooking(status) || status === "scheduled" || status === "completed") {
      row.approved += 1;
    } else if (isPendingShopReview(status)) {
      // still counts toward total only
    }
    byIssue.set(key, row);
  }

  let bestIssue: string | null = null;
  let bestRate = 0;
  let bestTotal = 0;

  for (const [key, stats] of byIssue) {
    if (stats.total < MIN_SAMPLE_SIZE) continue;
    const rate = stats.approved / stats.total;
    if (rate >= APPROVAL_RATE_THRESHOLD && rate > bestRate) {
      bestIssue = key;
      bestRate = rate;
      bestTotal = stats.total;
    }
  }

  if (!bestIssue) return null;

  const rules = await listWorkflowRules(pack.userId);
  if (hasSimilarRule(rules, bestIssue, "auto_approve")) return null;

  const displayIssue =
    pack.bookings.find((b) => issueKey(b.issueType) === bestIssue)?.issueType ?? bestIssue;
  const pct = Math.round(bestRate * 100);

  const draft: WorkflowRuleDraft = {
    name:
      locale === "ko"
        ? `${displayIssue} 자동 승인`
        : `${displayIssue} Auto Approve`,
    description:
      locale === "ko"
        ? `최근 ${LOOKBACK_DAYS}일 승인률 ${pct}%`
        : `${pct}% approval rate over the last ${LOOKBACK_DAYS} days`,
    enabled: true,
    priority: 15,
    source: "ai_suggestion",
    conditions: [{ type: "issue_contains", value: displayIssue } satisfies WorkflowCondition],
    actions: [{ type: "auto_approve" }],
  };

  const message =
    locale === "ko"
      ? `최근 ${LOOKBACK_DAYS}일 동안 ${displayIssue} 예약 ${pct}%가 승인되었습니다 (${bestTotal}건).\n자동 승인 규칙을 생성하시겠습니까?`
      : `Over the last ${LOOKBACK_DAYS} days, ${pct}% of ${displayIssue} bookings were approved (${bestTotal} total).\nCreate an auto-approve rule?`;

  return {
    kind: "preview",
    answer: message,
    preview: {
      id: crypto.randomUUID(),
      title: draft.name,
      message,
      risk: "medium",
      confirmLabel: locale === "ko" ? "생성" : "Create",
      cancelLabel: locale === "ko" ? "나중에" : "Later",
      rows: [
        {
          label: locale === "ko" ? "조건" : "Condition",
          value: locale === "ko" ? `이슈 = ${displayIssue}` : `Issue = ${displayIssue}`,
        },
        {
          label: locale === "ko" ? "동작" : "Action",
          value: locale === "ko" ? "자동 승인" : "Auto Approve",
        },
        {
          label: locale === "ko" ? "승인률" : "Approval Rate",
          value: `${pct}%`,
        },
      ],
      action: { type: "create_workflow_rule", rule: draft },
    },
    suggestions:
      locale === "ko"
        ? ["운영 규칙 목록 보여줘", "Gas Smell은 무조건 긴급 처리"]
        : ["Show automation rules", "Gas smell is always urgent"],
  };
}
