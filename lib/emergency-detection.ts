import type { JobPriority } from "./types";
import {
  legacyToServicePriority,
  mergeMenuServicePriority,
  normalizeServicePriority,
  servicePriorityToLegacy,
  type PrioritySource,
  type ServicePriority,
} from "./service-priority";
import { normalizeJobPriority } from "./priority-display";

export type EmergencyDetectionResult = {
  servicePriority: ServicePriority;
  priority: JobPriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
};

const SYSTEM_PROMPT = `You are an HVAC dispatch triage AI for US residential service companies.

Read the ENTIRE call transcript. Classify using context, severity, timing, and implied urgency — never keyword matching alone.

Assign exactly one priority:

P1 — Emergency
Life/safety, property damage, or total comfort failure under harsh conditions. Examples:
- No cooling during extreme heat (e.g. 105°F outside, indoor very hot, AC completely stopped)
- No heating during freezing weather
- Water leak, flood risk, active leaking
- Gas smell, carbon monoxide concern
- Complete system failure (unit dead, no airflow at all)
- Elderly, infant, or medically vulnerable occupants without AC/heat
- Medical concern related to HVAC failure
- Same-day / tonight urgency combined with no heat or no cool

P2 — Normal
Service needed but not an emergency. Examples:
- Weak airflow, reduced cooling/heating but system still runs
- Thermostat issues, strange noise, intermittent problems
- General repair requests without safety risk
- AC performance issue without total failure

P3 — Maintenance
Planned, preventive, or non-urgent work. Examples:
- Annual maintenance, tune-up, seasonal inspection
- Filter replacement (routine)
- Non-urgent scheduling ("next week", "whenever you can")
- Quote or estimate for routine service only

Rules:
- Base every reason on facts stated or clearly implied in the transcript.
- priorityReasons: 2–5 short English bullets for the dispatcher (e.g. "Customer reports no cooling", "Same-day service requested").
- Do not invent details not supported by the transcript.
- When uncertain between P2 and P1, choose P1 (safety-first).
- When uncertain between P2 and P3, choose P2 unless clearly routine maintenance.

Respond JSON only:
{
  "priority": "P1" | "P2" | "P3",
  "priorityReasons": string[]
}`;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => (x as string).trim())
    .slice(0, 8);
}

function parsePriorityFromResponse(data: Record<string, unknown>): JobPriority {
  if (data.priority === "P1" || data.priority === "P2" || data.priority === "P3") {
    return data.priority;
  }
  if (data.servicePriority != null) {
    return servicePriorityToLegacy(normalizeServicePriority(data.servicePriority));
  }
  return "P2";
}

export async function analyzeServicePriorityFromTranscript(
  transcript: string,
  options?: {
    menuPriority?: JobPriority | null;
    supplementalContext?: string;
  },
): Promise<EmergencyDetectionResult> {
  const text = transcript.trim();
  if (text.length < 8) {
    return {
      servicePriority: "normal",
      priority: "P2",
      priorityReasons: [
        "Transcript too short for AI classification; defaulted to P2 (Normal) for shop review.",
      ],
      prioritySource: "ai",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const userParts = [`Full call transcript:\n\n${text}`];
  if (options?.supplementalContext?.trim()) {
    userParts.push(`\nStructured context (secondary to transcript):\n${options.supplementalContext.trim()}`);
  }
  if (options?.menuPriority) {
    userParts.push(
      `\nCaller selected IVR urgency floor: ${options.menuPriority} (do not classify below this unless transcript clearly supports only routine maintenance).`,
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userParts.join("\n") },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[ai-priority-classification]", response.status, errText);
    throw new Error("OPENAI_REQUEST_FAILED");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");

  const data = JSON.parse(content) as Record<string, unknown>;
  let priority = normalizeJobPriority(parsePriorityFromResponse(data));
  const priorityReasons = asStringArray(data.priorityReasons);

  let servicePriority = legacyToServicePriority(priority);
  servicePriority = mergeMenuServicePriority(servicePriority, options?.menuPriority ?? null);
  priority = servicePriorityToLegacy(servicePriority);

  return {
    servicePriority,
    priority,
    priorityReasons:
      priorityReasons.length > 0
        ? priorityReasons
        : [`AI classified as ${priority} (${servicePriority}) from call transcript.`],
    prioritySource: "ai",
  };
}
