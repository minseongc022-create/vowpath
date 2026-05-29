import { applyPriorityGuardrails } from "./priority-guardrails";
import type { JobPriority } from "./types";

export type GeneratedJobCard = {
  priority: JobPriority;
  symptom: string;
  customerName: string;
  address: string;
  phone: string;
  arrivalWindow: string;
  dispatchNotes: string;
  jobberPasteBlock: string;
};

const SYSTEM_PROMPT = `You are an expert HVAC dispatch assistant for US residential shops using Jobber.
Given messy after-hours call notes, produce a dispatcher-ready Job Card.

Rules:
- priority: P1 = safety/no heat/no cool/leak/gas smell/elderly/infant; P2 = same-day comfort; P3 = maintenance/non-urgent
- When uncertain, choose the higher urgency (P1 over P2 over P3). Never under-classify urgent HVAC calls.
- symptom: short label like "No cool", "No heat", "Leak", "Maintenance"
- Use only facts from the notes. If missing, write "Unknown" for that field.
- arrivalWindow: realistic text for dispatcher (e.g. "Tonight 6–9pm" or "Next available AM")
- dispatchNotes: 2-4 bullet points for the tech/dispatcher
- jobberPasteBlock: plain-text block a human can paste into Jobber job notes

Respond with JSON only, matching this schema:
{
  "priority": "P1" | "P2" | "P3",
  "symptom": string,
  "customerName": string,
  "address": string,
  "phone": string,
  "arrivalWindow": string,
  "dispatchNotes": string,
  "jobberPasteBlock": string
}`;

function normalizePriority(value: unknown): JobPriority {
  if (value === "P1" || value === "P2" || value === "P3") return value;
  return "P2";
}

function asString(value: unknown, fallback = "Unknown"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function parseGeneratedJobCard(raw: unknown): GeneratedJobCard {
  const data = (raw ?? {}) as Record<string, unknown>;
  return {
    priority: normalizePriority(data.priority),
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
): Promise<GeneratedJobCard> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `After-hours HVAC call notes:\n\n${notes.trim()}`,
        },
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
  return applyPriorityGuardrails(notes, parsed);
}
