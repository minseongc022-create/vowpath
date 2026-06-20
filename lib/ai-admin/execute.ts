import { verifyPassword } from "../auth";
import {
  getCompanyAiMemory,
  saveCompanyAiMemory,
  type CompanyAiMemory,
} from "../company-ai-memory";
import { getShopBookingSettings, saveShopBookingSettings } from "../shop-settings-db";
import { saveShopProfile } from "../shop-profile-db";
import { deleteJobberTokens } from "../jobber-tokens";
import { findUserById, updateUserPhone } from "../users-db";
import { purgeUserAccount } from "../purge-user-account";
import {
  deleteWorkflowRule,
  saveWorkflowRule,
  updateWorkflowRule,
} from "../workflow-rules/store";
import { summarizeWorkflowRule } from "../workflow-rules/format";
import type {
  AiAdminExecutableAction,
  AiAdminExecutionResult,
  CompanyMemoryField,
} from "./types";
import type { WorkflowRuleDraft } from "../workflow-rules/types";

export class AiAdminExecutionError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AiAdminExecutionError";
    this.status = status;
  }
}

function splitAreas(value: string): string[] {
  return value
    .split(/[,\n;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinAreas(areas: string[]): string {
  return [...new Set(areas.map((area) => area.trim()).filter(Boolean))].join(", ");
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AiAdminExecutionError(`${label} is required.`);
  }
  return value.trim();
}

function isCompanyMemoryField(value: string): value is CompanyMemoryField {
  return (
    value === "serviceAreas" ||
    value === "businessHours" ||
    value === "holidayRules" ||
    value === "emergencyPolicy" ||
    value === "approvalPolicy" ||
    value === "specialInstructions"
  );
}

async function verifyHighRiskPassword(userId: string, password?: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AiAdminExecutionError("User not found.", 404);
  if (!password) throw new AiAdminExecutionError("Password confirmation required.", 403);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AiAdminExecutionError("Password confirmation failed.", 403);
}

function validateAction(action: unknown): AiAdminExecutableAction {
  if (!action || typeof action !== "object" || !("type" in action)) {
    throw new AiAdminExecutionError("Invalid admin action.");
  }
  const raw = action as Record<string, unknown>;
  switch (raw.type) {
    case "set_daily_briefing_sms":
      if (typeof raw.enabled !== "boolean") throw new AiAdminExecutionError("Invalid SMS setting.");
      return { type: "set_daily_briefing_sms", enabled: raw.enabled };
    case "set_daily_briefing_time": {
      const time = requireString(raw.time, "Time");
      if (!/^\d{2}:\d{2}$/.test(time)) throw new AiAdminExecutionError("Invalid time.");
      return { type: "set_daily_briefing_time", time };
    }
    case "append_service_area":
      return { type: "append_service_area", area: requireString(raw.area, "Service area") };
    case "remove_service_area":
      return { type: "remove_service_area", area: requireString(raw.area, "Service area") };
    case "set_company_memory_field": {
      const field = requireString(raw.field, "Field");
      if (!isCompanyMemoryField(field)) throw new AiAdminExecutionError("Invalid field.");
      return {
        type: "set_company_memory_field",
        field,
        value: requireString(raw.value, "Value"),
      };
    }
    case "set_booking_mode":
      if (raw.mode === "control") {
        return { type: "set_owner_approval_sms", level: "all" };
      }
      if (raw.mode === "speed" || raw.mode === "hybrid" || raw.mode === "auto") {
        return { type: "set_owner_approval_sms", level: "p1_only" };
      }
      throw new AiAdminExecutionError("Invalid booking mode.");
    case "set_owner_approval_sms":
      if (raw.level !== "off" && raw.level !== "p1_only" && raw.level !== "all") {
        throw new AiAdminExecutionError("Invalid owner approval SMS setting.");
      }
      return { type: "set_owner_approval_sms", level: raw.level };
    case "set_ai_phone_answering":
      if (typeof raw.enabled !== "boolean") {
        throw new AiAdminExecutionError("Invalid AI phone answering setting.");
      }
      return { type: "set_ai_phone_answering", enabled: raw.enabled };
    case "create_workflow_rule": {
      if (!raw.rule || typeof raw.rule !== "object") {
        throw new AiAdminExecutionError("Invalid workflow rule.");
      }
      return { type: "create_workflow_rule", rule: raw.rule as WorkflowRuleDraft };
    }
    case "toggle_workflow_rule": {
      const ruleId = requireString(raw.ruleId, "Rule ID");
      if (typeof raw.enabled !== "boolean") {
        throw new AiAdminExecutionError("Invalid rule toggle.");
      }
      return { type: "toggle_workflow_rule", ruleId, enabled: raw.enabled };
    }
    case "delete_workflow_rule":
      return {
        type: "delete_workflow_rule",
        ruleId: requireString(raw.ruleId, "Rule ID"),
      };
    case "delete_account":
      return { type: "delete_account" };
    case "disconnect_jobber":
      return { type: "disconnect_jobber" };
    case "update_owner_phone":
      return { type: "update_owner_phone", phone: requireString(raw.phone, "Phone") };
    default:
      throw new AiAdminExecutionError("This admin action is not supported.");
  }
}

async function saveMemoryPatch(
  userId: string,
  patch: Partial<Omit<CompanyAiMemory, "userId" | "updatedAt">>,
) {
  const current = await getCompanyAiMemory(userId);
  return saveCompanyAiMemory(userId, { ...current, ...patch });
}

export async function executeAiAdminAction(params: {
  userId: string;
  action: unknown;
  password?: string;
}): Promise<AiAdminExecutionResult> {
  const action = validateAction(params.action);

  const needsPassword =
    action.type === "delete_account" ||
    action.type === "disconnect_jobber" ||
    action.type === "update_owner_phone" ||
    action.type === "delete_workflow_rule";
  if (needsPassword) await verifyHighRiskPassword(params.userId, params.password);

  if (action.type === "set_daily_briefing_sms") {
    const memory = await saveMemoryPatch(params.userId, {
      dailyBriefingSmsEnabled: action.enabled,
    });
    return {
      message: action.enabled
        ? "Daily Briefing SMS is now enabled."
        : "Daily Briefing SMS is now disabled.",
      rows: [{ label: "Daily Briefing SMS", value: memory.dailyBriefingSmsEnabled ? "On" : "Off" }],
    };
  }

  if (action.type === "set_daily_briefing_time") {
    const memory = await saveMemoryPatch(params.userId, {
      dailyBriefingSmsTime: action.time,
    });
    return {
      message: `Daily Briefing SMS time is now ${memory.dailyBriefingSmsTime}.`,
      rows: [{ label: "Daily Briefing Time", value: memory.dailyBriefingSmsTime }],
    };
  }

  if (action.type === "append_service_area" || action.type === "remove_service_area") {
    const current = await getCompanyAiMemory(params.userId);
    const area = action.area.trim();
    const areas = splitAreas(current.serviceAreas);
    const nextAreas =
      action.type === "append_service_area"
        ? joinAreas([...areas, area])
        : joinAreas(areas.filter((item) => item.toLowerCase() !== area.toLowerCase()));
    const memory = await saveMemoryPatch(params.userId, { serviceAreas: nextAreas });
    return {
      message:
        action.type === "append_service_area"
          ? `${area} was added to service areas.`
          : `${area} was removed from service areas.`,
      rows: [{ label: "Service Areas", value: memory.serviceAreas || "None saved" }],
    };
  }

  if (action.type === "set_company_memory_field") {
    const memory = await saveMemoryPatch(params.userId, {
      [action.field]: action.value,
    });
    return {
      message: "Company AI Memory was updated.",
      rows: [{ label: action.field, value: String(memory[action.field] ?? "") }],
    };
  }

  if (action.type === "set_booking_mode") {
    const level = action.mode === "control" ? "all" : "p1_only";
    const settings = await saveShopBookingSettings(params.userId, {
      schedulingEnabled: true,
      ownerApprovalSms: level,
    });
    return {
      message:
        level === "all"
          ? "You will now get approval texts for every booking."
          : "Smart auto-book is active — only urgent or unclear jobs need your text.",
      rows: [
        { label: "Policy", value: "Smart auto-book" },
        { label: "Owner Approval SMS", value: settings.ownerApprovalSms },
      ],
    };
  }

  if (action.type === "set_owner_approval_sms") {
    const settings = await saveShopBookingSettings(params.userId, {
      ownerApprovalSms: action.level,
    });
    return {
      message: `Owner approval SMS is now ${settings.ownerApprovalSms}.`,
      rows: [{ label: "Owner Approval SMS", value: settings.ownerApprovalSms }],
    };
  }

  if (action.type === "set_ai_phone_answering") {
    const profile = await saveShopProfile(params.userId, {
      answerScheduleActive: action.enabled,
      scheduleAlwaysOn: action.enabled,
    });
    return {
      message: action.enabled
        ? "AI phone answering is now enabled."
        : "AI phone answering is now disabled.",
      rows: [
        { label: "AI Phone Answering", value: profile.answerScheduleActive ? "On" : "Off" },
        { label: "Always On", value: profile.scheduleAlwaysOn ? "On" : "Off" },
      ],
    };
  }

  if (action.type === "create_workflow_rule") {
    try {
      const rule = await saveWorkflowRule(params.userId, {
        ...action.rule,
        source: action.rule.source ?? "ai_chat",
        createdBy: params.userId,
      });
      return {
        message: `Automation rule "${rule.name}" was created.`,
        rows: [
          { label: "Rule", value: rule.name },
          { label: "Summary", value: summarizeWorkflowRule(rule) },
          { label: "Status", value: rule.enabled ? "Active" : "Inactive" },
        ],
      };
    } catch (e) {
      throw new AiAdminExecutionError(
        e instanceof Error ? e.message : "Failed to create workflow rule.",
      );
    }
  }

  if (action.type === "toggle_workflow_rule") {
    const updated = await updateWorkflowRule(params.userId, action.ruleId, {
      enabled: action.enabled,
    });
    if (!updated) throw new AiAdminExecutionError("Workflow rule not found.", 404);
    return {
      message: action.enabled
        ? `"${updated.name}" is now active.`
        : `"${updated.name}" is now inactive.`,
      rows: [{ label: "Status", value: updated.enabled ? "Active" : "Inactive" }],
    };
  }

  if (action.type === "delete_workflow_rule") {
    const ok = await deleteWorkflowRule(params.userId, action.ruleId);
    if (!ok) throw new AiAdminExecutionError("Workflow rule not found.", 404);
    return { message: "Automation rule was deleted." };
  }

  if (action.type === "delete_account") {
    const result = await purgeUserAccount(params.userId);
    if (!result.ok) throw new AiAdminExecutionError("Account not found.", 404);
    return { message: "Your account was deleted." };
  }

  if (action.type === "disconnect_jobber") {
    await deleteJobberTokens(params.userId);
    return { message: "Jobber was disconnected." };
  }

  if (action.type === "update_owner_phone") {
    const user = await updateUserPhone(params.userId, action.phone);
    if (!user) throw new AiAdminExecutionError("User not found.", 404);
    return {
      message: "Owner phone was updated.",
      rows: [{ label: "Phone", value: user.phone ?? "" }],
    };
  }

  throw new AiAdminExecutionError("Unsupported admin action.");
}
