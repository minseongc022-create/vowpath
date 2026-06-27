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
import { normalizeLossCategory, type LossCategory } from "./loss-category";

export type EmergencyDetectionResult = {
  servicePriority: ServicePriority;
  priority: JobPriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  lossCategory: LossCategory;
};

const SYSTEM_PROMPT = `You are a restoration dispatch triage AI for US water, fire, and mold companies.

Read the ENTIRE call transcript. Classify using context, severity, timing, and implied urgency — never keyword matching alone.

Assign exactly one priority:

P1 — Emergency
Active property damage, safety risk, or losses that need immediate crew dispatch. Examples:
- Active water flooding, burst pipe, water through ceiling
- Fire damage, smoke throughout home, structure concern
- Sewage backup (Cat-3), contaminated water
- Mold spread with health concern stated
- Large commercial loss or multi-unit flooding
- Same-day / tonight urgency with active damage spreading

P2 — Normal
Service needed soon but not spreading or life-threatening. Examples:
- Recent water damage drying follow-up
- Smoke odor without active fire
- Visible mold in one area without stated health emergency
- Non-urgent leak that is contained
- Inspection or assessment requests within days

P3 — Maintenance / follow-up
Planned, preventive, or non-urgent work. Examples:
- Post-mitigation monitoring check
- Rebuild estimate scheduling
- Non-urgent mold testing
- "Next week" or flexible timing with no active spread

Rules:
- Base every reason on facts stated or clearly implied in the transcript.
- priorityReasons: 2–5 short English bullets for the dispatcher.
- Do not invent details not supported by the transcript.
- When uncertain between P2 and P1, choose P1 (property damage spreads fast).
- When uncertain between P2 and P3, choose P2 unless clearly routine follow-up.

Also classify lossCategory:
- water: active or recent water/flood/leak losses
- fire: fire, smoke, soot damage
- mold: mold/mildew
- sewage_cat3: sewage backup, contaminated water, Cat-3
- commercial: large commercial or multi-unit property
- inspection: assessment, estimate, follow-up, monitoring only
- other: unclear

Respond JSON only:
{
  "priority": "P1" | "P2" | "P3",
  "lossCategory": "water" | "fire" | "mold" | "sewage_cat3" | "commercial" | "inspection" | "other",
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
      lossCategory: "other",
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
    lossCategory: normalizeLossCategory(data.lossCategory),
  };
}
