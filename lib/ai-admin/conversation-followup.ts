import type { UiLocale } from "../locale";
import type { AiAdminAnalysisResult } from "./types";
import type { WorkflowRule } from "../workflow-rules/types";
import { workflowRulePreviewRows } from "../workflow-rules/format";

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
};

export function parseChatHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const role = row.role === "user" || row.role === "assistant" ? row.role : null;
    if (!role) continue;
    const text = String(row.text ?? row.content ?? row.answer ?? "").trim();
    if (text) turns.push({ role, text });
  }
  return turns.slice(-12);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isRevertToManualIntent(query: string): boolean {
  const q = normalize(query);
  return (
    q.includes("다시 수동") ||
    q.includes("수동으로 바꿔") ||
    q.includes("수동으로 돌려") ||
    q.includes("수동 승인") ||
    q.includes("자동 승인 끄") ||
    q.includes("자동승인 끄") ||
    q.includes("규칙 끄") ||
    q.includes("되돌려") ||
    q.includes("undo") ||
    q.includes("turn off auto approve") ||
    q.includes("back to manual") ||
    q.includes("manual again") ||
    q.includes("disable auto approve") ||
    (q.includes("수동") && (q.includes("바꿔") || q.includes("돌려") || q.includes("해줘")))
  );
}

export function isGlobalManualIntent(query: string): boolean {
  const q = normalize(query);
  return (
    q.includes("모든 예약") ||
    q.includes("전체 수동") ||
    q.includes("all manual") ||
    q.includes("everything manual") ||
    (q.includes("수동") && q.includes("전체"))
  );
}

function lastAssistantMentionedRule(history: ChatTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t.role !== "assistant") continue;
    const lower = t.text.toLowerCase();
    if (lower.includes("no cooling") || lower.includes("냉각") || lower.includes("노쿨링")) return "no cooling";
    if (lower.includes("gas smell") || lower.includes("가스")) return "gas smell";
    if (lower.includes("weekend") || lower.includes("주말")) return "weekend";
    if (lower.includes("automation rule") || lower.includes("운영 규칙")) break;
  }
  return null;
}

function findAutoApproveRule(
  rules: WorkflowRule[],
  hint: string | null,
): WorkflowRule | null {
  const enabled = rules.filter(
    (r) => r.enabled && r.actions.some((a) => a.type === "auto_approve"),
  );
  if (!enabled.length) return null;
  if (hint) {
    const match = enabled.find((r) => {
      const blob = [
        r.name,
        r.description ?? "",
        ...r.conditions.map((c) => ("value" in c ? String(c.value) : "")),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(hint);
    });
    if (match) return match;
  }
  return [...enabled].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function resolveConversationFollowUp(params: {
  query: string;
  history: ChatTurn[];
  workflowRules: WorkflowRule[];
  locale: UiLocale;
}): AiAdminAnalysisResult | null {
  const { query, history, workflowRules, locale } = params;
  const ko = locale === "ko";

  if (!isRevertToManualIntent(query)) return null;

  if (isGlobalManualIntent(query)) {
    return {
      kind: "preview",
      answer: ko
        ? "모든 예약을 수동 승인 모드로 바꿉니다."
        : "Switch all bookings to manual approval.",
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "전체 수동 승인" : "Manual Approval (All)",
        message: ko
          ? "방금 만든 자동 승인 규칙과 별개로, 전역 예약 모드를 수동 승인으로 바꿉니다."
          : "This changes the global booking mode to manual approval.",
        risk: "medium",
        confirmLabel: ko ? "변경" : "Confirm",
        cancelLabel: ko ? "취소" : "Cancel",
        action: { type: "set_booking_mode", mode: "control" },
      },
      suggestions: ko ? ["운영 규칙 목록 보여줘"] : ["Show automation rules"],
    };
  }

  const hint = lastAssistantMentionedRule(history);
  const rule = findAutoApproveRule(workflowRules, hint);
  if (rule) {
    return {
      kind: "preview",
      answer: ko
        ? `"${rule.name}" 자동 승인 규칙을 끄면 다시 수동 승인 흐름으로 돌아갑니다.`
        : `Turning off "${rule.name}" restores manual approval for that case.`,
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "자동 승인 규칙 끄기" : "Disable Auto-Approve Rule",
        message: ko
          ? "이전 대화에서 만든 규칙을 비활성화합니다. 삭제하지 않고 끕니다."
          : "Disables the rule from your recent conversation (not deleted).",
        risk: "medium",
        confirmLabel: ko ? "끄기" : "Turn off",
        cancelLabel: ko ? "취소" : "Cancel",
        rows: workflowRulePreviewRows(rule, locale),
        action: { type: "toggle_workflow_rule", ruleId: rule.id, enabled: false },
      },
      suggestions: ko
        ? ["운영 규칙 목록 보여줘", "수동 승인으로 전체 바꿔줘"]
        : ["Show automation rules", "Switch all to manual approval"],
    };
  }

  return {
    kind: "preview",
    answer: ko
      ? "자동 승인 규칙은 없지만, 전역 예약 모드를 수동 승인으로 바꿀 수 있습니다."
      : "No auto-approve rule is active. You can switch global booking to manual approval.",
    preview: {
      id: crypto.randomUUID(),
      title: ko ? "수동 승인 모드" : "Manual Approval Mode",
      message: ko
        ? "모든 예약이 다시 승인 대기로 갑니다."
        : "All new bookings will require your approval again.",
      risk: "medium",
      confirmLabel: ko ? "변경" : "Confirm",
      cancelLabel: ko ? "취소" : "Cancel",
      action: { type: "set_booking_mode", mode: "control" },
    },
    suggestions: [],
  };
}
