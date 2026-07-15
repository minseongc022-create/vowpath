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

  if (!isRevertToManualIntent(query)) return null;

  if (isGlobalManualIntent(query)) {
    return {
      kind: "preview",
      answer: "Switch all bookings to manual approval.",
      preview: {
        id: crypto.randomUUID(),
        title: "Manual Approval (All)",
        message: "This changes the global booking mode to manual approval.",
        risk: "medium",
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        action: { type: "set_booking_mode", mode: "control" },
      },
      suggestions: ["Show automation rules"],
    };
  }

  const hint = lastAssistantMentionedRule(history);
  const rule = findAutoApproveRule(workflowRules, hint);
  if (rule) {
    return {
      kind: "preview",
      answer: `Turning off "${rule.name}" restores manual approval for that case.`,
      preview: {
        id: crypto.randomUUID(),
        title: "Disable Auto-Approve Rule",
        message: "Disables the rule from your recent conversation (not deleted).",
        risk: "medium",
        confirmLabel: "Turn off",
        cancelLabel: "Cancel",
        rows: workflowRulePreviewRows(rule, locale),
        action: { type: "toggle_workflow_rule", ruleId: rule.id, enabled: false },
      },
      suggestions: ["Show automation rules", "Switch all to manual approval"],
    };
  }

  return {
    kind: "preview",
    answer: "No auto-approve rule is active. You can switch global booking to manual approval.",
    preview: {
      id: crypto.randomUUID(),
      title: "Manual Approval Mode",
      message: "All new bookings will require your approval again.",
      risk: "medium",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      action: { type: "set_booking_mode", mode: "control" },
    },
    suggestions: [],
  };
}
