import { applyPriorityAnalysisToCard } from "./apply-service-priority";
import { legacyToServicePriority, type PrioritySource, type ServicePriority } from "./service-priority";
import type { ShopVertical } from "./shop-vertical";
import type { JobPriority } from "./types";

export type GeneratedJobCard = {
  priority: JobPriority;
  servicePriority: ServicePriority;
  priorityReasons: string[];
  prioritySource: PrioritySource;
  symptom: string;
  customerName: string;
  address: string;
  phone: string;
  arrivalWindow: string;
  dispatchNotes: string;
  jobberPasteBlock: string;
};

const RESTORATION_SYSTEM_PROMPT = `You are an expert restoration dispatch assistant for US water, fire, and mold companies.
Given messy after-hours call notes, produce a dispatcher-ready Job Card.

Rules:
- symptom: short label like "Water loss", "Fire/smoke", "Mold", "Sewage", "Inspection"
- Do NOT set priority (classified separately from full transcript)
- Use only facts from the notes. If missing, write "Unknown" for that field.
- arrivalWindow: customer PREFERENCE only (e.g. "Caller needs crew tonight") OR "Pending dispatch review" — NEVER a confirmed ETA
- NEVER write that a crew is dispatched, confirmed, or on the way unless notes explicitly state shop approved
- dispatchNotes: 2-4 bullet points for the crew/dispatcher; note insurance info if mentioned
- jobberPasteBlock: plain-text block a human can paste into CRM request notes (intake only, not confirmed job)

Respond with JSON only, matching this schema:
{
  "symptom": string,
  "customerName": string,
  "address": string,
  "phone": string,
  "arrivalWindow": string,
  "dispatchNotes": string,
  "jobberPasteBlock": string
}`;

const HVAC_SYSTEM_PROMPT = `You are an expert HVAC dispatch assistant for US residential service companies.
Given messy after-hours call notes, produce a dispatcher-ready Job Card.

Rules:
- symptom: short label like "No heat", "No cooling", "Gas smell", "Leak", "Maintenance", "Thermostat"
- Do NOT set priority (classified separately from full transcript)
- Use only facts from the notes. If missing, write "Unknown" for that field.
- arrivalWindow: customer PREFERENCE only (e.g. "Caller needs heat tonight") OR "Pending dispatch review" — NEVER a confirmed ETA
- NEVER write that a tech is dispatched, confirmed, or on the way unless notes explicitly state shop approved
- dispatchNotes: 2-4 bullet points for the tech/dispatcher; note safety concerns (gas smell, CO, sparking) if mentioned
- jobberPasteBlock: plain-text block a human can paste into CRM or dispatch notes (intake only, not confirmed job)

Respond with JSON only, matching this schema:
{
  "symptom": string,
  "customerName": string,
  "address": string,
  "phone": string,
  "arrivalWindow": string,
  "dispatchNotes": string,
  "jobberPasteBlock": string
}`;

const GENERAL_SYSTEM_PROMPT = `You are an expert home-services dispatch assistant for US trade contractors.
Given messy after-hours call notes, produce a dispatcher-ready Job Card.

Rules:
- symptom: short service label (e.g. "Emergency leak", "No power", "Pest issue", "Estimate")
- Do NOT set priority (classified separately from full transcript)
- Use only facts from the notes. If missing, write "Unknown" for that field.
- arrivalWindow: customer PREFERENCE only OR "Pending dispatch review" — NEVER a confirmed ETA
- NEVER write that a crew is dispatched unless notes explicitly state shop approved
- dispatchNotes: 2-4 bullet points for the dispatcher
- jobberPasteBlock: plain-text block for CRM notes (intake only)

Respond with JSON only, matching this schema:
{
  "symptom": string,
  "customerName": string,
  "address": string,
  "phone": string,
  "arrivalWindow": string,
  "dispatchNotes": string,
  "jobberPasteBlock": string
}`;

function systemPromptForVertical(vertical: ShopVertical): string {
  switch (vertical) {
    case "hvac":
      return HVAC_SYSTEM_PROMPT;
    case "restoration":
      return RESTORATION_SYSTEM_PROMPT;
    default:
      return GENERAL_SYSTEM_PROMPT;
  }
}

function userPromptForVertical(vertical: ShopVertical, notes: string): string {
  const trimmed = notes.trim();
  switch (vertical) {
    case "hvac":
      return `After-hours HVAC call notes:\n\n${trimmed}`;
    case "restoration":
      return `After-hours restoration call notes:\n\n${trimmed}`;
    default:
      return `After-hours service call notes:\n\n${trimmed}`;
  }
}

function normalizePriority(value: unknown): JobPriority {
  if (value === "P1" || value === "P2" || value === "P3") return value;
  return "P2";
}

function asString(value: unknown, fallback = "Unknown"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseGeneratedJobCard(raw: unknown): GeneratedJobCard {
  const data = (raw ?? {}) as Record<string, unknown>;
  const priority = normalizePriority(data.priority);
  return {
    priority,
    servicePriority: legacyToServicePriority(priority),
    priorityReasons: [],
    prioritySource: "ai",
    symptom: asString(data.symptom, "Service call"),
    customerName: asString(data.customerName),
    address: asString(data.address),
    phone: asString(data.phone, "—"),
    arrivalWindow: asString(data.arrivalWindow, "TBD"),
    dispatchNotes: asString(data.dispatchNotes),
    jobberPasteBlock: asString(data.jobberPasteBlock),
  };
}

export async function generateJobCardFromNotes(
  notes: string,
  options?: {
    transcript?: string;
    menuPriority?: JobPriority | null;
    model?: string;
    vertical?: ShopVertical;
  },
): Promise<GeneratedJobCard> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const vertical = options?.vertical ?? "restoration";
  const model =
    options?.model ??
    process.env.OPENAI_MODEL_ECONOMY ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPromptForVertical(vertical) },
        { role: "user", content: userPromptForVertical(vertical, notes) },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[job-card-ai]", response.status, errText);
    if (
      response.status === 429 &&
      (errText.includes("insufficient_quota") || errText.includes("quota"))
    ) {
      throw new Error("OPENAI_INSUFFICIENT_QUOTA");
    }
    if (response.status === 401) {
      throw new Error("OPENAI_INVALID_KEY");
    }
    throw new Error("OPENAI_REQUEST_FAILED");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OPENAI_EMPTY_RESPONSE");
  }

  const parsed = parseGeneratedJobCard(JSON.parse(content));
  const transcript = (options?.transcript ?? notes).trim();
  return applyPriorityAnalysisToCard(transcript, parsed, options?.menuPriority ?? null);
}
