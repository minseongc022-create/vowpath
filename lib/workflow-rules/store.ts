import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { kv } from "@vercel/kv";
import { kvGetSafe } from "../kv-safe";
import { useKvStore } from "../kv-config";
import type {
  WorkflowAction,
  WorkflowCondition,
  WorkflowRule,
  WorkflowRuleDraft,
  WorkflowRulesDocument,
} from "./types";
import { MAX_WORKFLOW_RULES } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "workflow-rules.json");

function kvKey(userId: string) {
  return `vowpath:workflow-rules:${userId}`;
}

function emptyDocument(userId: string): WorkflowRulesDocument {
  return { userId, rules: [], updatedAt: new Date().toISOString() };
}

async function readFileStore(): Promise<Record<string, WorkflowRulesDocument>> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    return JSON.parse(await readFile(FILE, "utf-8")) as Record<string, WorkflowRulesDocument>;
  } catch {
    return {};
  }
}

async function writeFileStore(store: Record<string, WorkflowRulesDocument>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(store, null, 2), "utf-8");
}

function cleanCondition(raw: unknown): WorkflowCondition | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const item = raw as Record<string, unknown>;
  switch (item.type) {
    case "issue_equals":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "issue_equals", value: item.value.trim() }
        : null;
    case "issue_contains":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "issue_contains", value: item.value.trim() }
        : null;
    case "call_keyword":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "call_keyword", value: item.value.trim() }
        : null;
    case "ai_classification":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "ai_classification", label: item.value.trim() }
        : null;
    case "priority_is":
      return item.value === "P1" || item.value === "P2" || item.value === "P3"
        ? { type: "priority_is", value: item.value }
        : null;
    case "booking_day_in": {
      const allowed = new Set([
        "sun",
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
      ]);
      const days = Array.isArray(item.days)
        ? item.days.filter((d): d is import("./types").Weekday => typeof d === "string" && allowed.has(d))
        : [];
      return days.length ? { type: "booking_day_in", days } : null;
    }
    case "after_hours":
      return typeof item.value === "boolean" ? { type: "after_hours", value: item.value } : null;
    case "service_area_in":
      return {
        type: "service_area_in",
        zips: Array.isArray(item.zips)
          ? item.zips.map(String).filter(Boolean)
          : undefined,
        cities: Array.isArray(item.cities)
          ? item.cities.map(String).filter(Boolean)
          : undefined,
      };
    case "confidence_below":
      return typeof item.threshold === "number" && Number.isFinite(item.threshold)
        ? { type: "confidence_below", threshold: item.threshold }
        : null;
    case "customer_type":
      return item.value === "new" || item.value === "returning"
        ? { type: "customer_type", value: item.value }
        : null;
    case "jobber_client_exists":
      return typeof item.value === "boolean"
        ? { type: "jobber_client_exists", value: item.value }
        : null;
    case "jobber_tag":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "jobber_tag", value: item.value.trim() }
        : null;
    default:
      return null;
  }
}

function cleanAction(raw: unknown): WorkflowAction | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const item = raw as Record<string, unknown>;
  switch (item.type) {
    case "auto_approve":
    case "require_manual_approval":
    case "send_owner_sms":
    case "skip_owner_sms":
    case "send_owner_email":
    case "create_calendar_hold":
    case "push_jobber_on_approve":
      return { type: item.type };
    case "send_customer_sms":
      return item.template === "scheduled" || item.template === "pending"
        ? { type: "send_customer_sms", template: item.template }
        : null;
    case "set_priority":
      return item.value === "P1" || item.value === "P2" || item.value === "P3"
        ? { type: "set_priority", value: item.value }
        : null;
    case "add_tag":
      return typeof item.value === "string" && item.value.trim()
        ? { type: "add_tag", value: item.value.trim() }
        : null;
    default:
      return null;
  }
}

export function sanitizeWorkflowRuleDraft(
  draft: WorkflowRuleDraft,
  userId: string,
): WorkflowRule {
  const conditions = (draft.conditions ?? [])
    .map(cleanCondition)
    .filter((c): c is WorkflowCondition => Boolean(c));
  const actions = (draft.actions ?? [])
    .map(cleanAction)
    .filter((a): a is WorkflowAction => Boolean(a));

  if (!conditions.length) throw new Error("At least one condition is required.");
  if (!actions.length) throw new Error("At least one action is required.");

  const now = new Date().toISOString();
  return {
    id: draft.id ?? crypto.randomUUID(),
    name: String(draft.name ?? "Automation Rule").trim() || "Automation Rule",
    description: draft.description?.trim() || undefined,
    enabled: draft.enabled !== false,
    priority: Number.isFinite(draft.priority) ? Number(draft.priority) : 100,
    source: draft.source ?? "manual",
    conditionMatch: draft.conditionMatch === "any" ? "any" : "all",
    conditions,
    actions,
    createdAt: now,
    updatedAt: now,
    createdBy: draft.createdBy ?? userId,
    matchCount: 0,
  };
}

export async function getWorkflowRulesDocument(userId: string): Promise<WorkflowRulesDocument> {
  if (useKvStore()) {
    return (await kvGetSafe<WorkflowRulesDocument>(kvKey(userId))) ?? emptyDocument(userId);
  }
  const store = await readFileStore();
  return store[userId] ?? emptyDocument(userId);
}

export async function listWorkflowRules(userId: string): Promise<WorkflowRule[]> {
  const doc = await getWorkflowRulesDocument(userId);
  return [...doc.rules].sort(
    (a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function getWorkflowRule(
  userId: string,
  ruleId: string,
): Promise<WorkflowRule | null> {
  const rules = await listWorkflowRules(userId);
  return rules.find((r) => r.id === ruleId) ?? null;
}

async function saveDocument(doc: WorkflowRulesDocument): Promise<WorkflowRulesDocument> {
  doc.updatedAt = new Date().toISOString();
  if (useKvStore()) {
    await kv.set(kvKey(doc.userId), doc);
    return doc;
  }
  const store = await readFileStore();
  store[doc.userId] = doc;
  await writeFileStore(store);
  return doc;
}

export async function saveWorkflowRule(
  userId: string,
  draft: WorkflowRuleDraft,
): Promise<WorkflowRule> {
  const doc = await getWorkflowRulesDocument(userId);
  const rule = sanitizeWorkflowRuleDraft({ ...draft, createdBy: draft.createdBy ?? userId }, userId);
  const existingIdx = doc.rules.findIndex((r) => r.id === rule.id);
  if (existingIdx >= 0) {
    rule.createdAt = doc.rules[existingIdx].createdAt;
    rule.matchCount = doc.rules[existingIdx].matchCount ?? 0;
    rule.lastMatchedAt = doc.rules[existingIdx].lastMatchedAt;
    doc.rules[existingIdx] = rule;
  } else {
    if (doc.rules.length >= MAX_WORKFLOW_RULES) {
      throw new Error(`Maximum ${MAX_WORKFLOW_RULES} automation rules allowed.`);
    }
    doc.rules.push(rule);
  }
  await saveDocument(doc);
  return rule;
}

export async function updateWorkflowRule(
  userId: string,
  ruleId: string,
  patch: Partial<Pick<WorkflowRule, "enabled" | "name" | "description" | "priority" | "conditions" | "actions">>,
): Promise<WorkflowRule | null> {
  const doc = await getWorkflowRulesDocument(userId);
  const idx = doc.rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  const current = doc.rules[idx];
  const merged = sanitizeWorkflowRuleDraft(
    {
      ...current,
      ...patch,
      id: ruleId,
      source: current.source,
      createdBy: current.createdBy,
      enabled: patch.enabled ?? current.enabled,
    },
    userId,
  );
  merged.createdAt = current.createdAt;
  merged.matchCount = current.matchCount ?? 0;
  merged.lastMatchedAt = current.lastMatchedAt;
  doc.rules[idx] = merged;
  await saveDocument(doc);
  return merged;
}

export async function deleteWorkflowRule(userId: string, ruleId: string): Promise<boolean> {
  const doc = await getWorkflowRulesDocument(userId);
  const next = doc.rules.filter((r) => r.id !== ruleId);
  if (next.length === doc.rules.length) return false;
  doc.rules = next;
  await saveDocument(doc);
  return true;
}

export async function recordWorkflowRuleMatch(
  userId: string,
  ruleIds: string[],
): Promise<void> {
  if (!ruleIds.length) return;
  const doc = await getWorkflowRulesDocument(userId);
  const now = new Date().toISOString();
  let changed = false;
  for (const rule of doc.rules) {
    if (!ruleIds.includes(rule.id)) continue;
    rule.matchCount = (rule.matchCount ?? 0) + 1;
    rule.lastMatchedAt = now;
    rule.updatedAt = now;
    changed = true;
  }
  if (changed) await saveDocument(doc);
}
