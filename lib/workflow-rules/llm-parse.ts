import { openAiJsonCompletion } from "../openai-json";
import type { UiLocale } from "../locale";
import type { WorkflowRuleDraft } from "./types";

const SYSTEM = `You convert HVAC shop owner requests into automation workflow rules.
Return JSON only:
{
  "name": string,
  "description": string,
  "conditionMatch": "all" | "any",
  "conditions": WorkflowCondition[],
  "actions": WorkflowAction[],
  "priority": number
}

WorkflowCondition types:
- issue_equals, issue_contains: { type, value: string }
- priority_is: { type, value: "P1"|"P2"|"P3" }
- booking_day_in: { type, days: ["sun"|"mon"|...] }
- after_hours: { type, value: boolean }
- call_keyword: { type, value: string }
- customer_type: { type, value: "new"|"returning" }
- jobber_client_exists: { type, value: boolean }

WorkflowAction types:
- auto_approve, require_manual_approval, send_owner_sms, skip_owner_sms
- set_priority: { type, value: "P1"|"P2"|"P3" }
- add_tag: { type, value: string }
- send_customer_sms: { type, template: "scheduled"|"pending" }
- send_owner_email, create_calendar_hold, push_jobber_on_approve

Safety: gas smell, water leak, no heat emergencies → P1 + require_manual_approval + send_owner_sms.
Never auto_approve gas smell rules.`;

export async function parseWorkflowRuleWithLlm(
  query: string,
  locale: UiLocale,
): Promise<WorkflowRuleDraft | null> {
  try {
    const raw = await openAiJsonCompletion<WorkflowRuleDraft>({
      system: SYSTEM,
      user: `Locale: ${locale}\nOwner request: ${query}`,
    });
    if (!raw.conditions?.length || !raw.actions?.length) return null;
    return {
      ...raw,
      enabled: true,
      source: "ai_chat",
      priority: Number.isFinite(raw.priority) ? Number(raw.priority) : 100,
      conditionMatch: raw.conditionMatch === "any" ? "any" : "all",
    };
  } catch {
    return null;
  }
}
