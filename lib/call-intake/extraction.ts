import { applyPriorityAnalysisToDraft } from "../apply-service-priority";
import type { JobPriority } from "../types";
import type { FieldConfidence, IntakeDraft } from "./types";

export type IntakeExtractionResult = {
  draft: IntakeDraft;
  confidence: FieldConfidence;
};

const SYSTEM_PROMPT = `You are an HVAC after-hours intake assistant for US residential shops.
Extract structured fields from call notes. Never confirm appointments or assign technicians.

Rules:
- customerName: caller's name only
- address: full service street address with city/state when possible
- serviceLocation: where work is performed (usually same as address; if unclear, copy address)
- issueType: short label (e.g. "AC not cooling", "No heat")
- symptom: dispatcher label (No cool, No heat, Leak, Maintenance)
- arrivalWindow: customer preference ONLY or "Pending shop review" — never confirmed times
- Do NOT set priority here (classified separately from full transcript)
- phone: IGNORE spoken phone numbers; always return "USE_CALLER_ID"
- confidence: 0-100 per field for customerName, address, serviceLocation, issueType

Respond JSON only:
{
  "customerName": string,
  "address": string,
  "serviceLocation": string,
  "issueType": string,
  "symptom": string,
  "arrivalWindow": string,
  "dispatchNotes": string,
  "jobberPasteBlock": string,
  "confidence": {
    "customerName": number,
    "address": number,
    "serviceLocation": number,
    "issueType": number
  }
}`;

function clampConfidence(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function asString(value: unknown, fallback = "Unknown"): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function extractIntakeFromSpeech(
  speech: string,
  menuPriority: JobPriority | null,
): Promise<IntakeExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Call transcript:\n\n${speech.trim()}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[call-intake/extraction]", response.status, errText);
    throw new Error("OPENAI_REQUEST_FAILED");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");

  const data = JSON.parse(content) as Record<string, unknown>;
  const confRaw = (data.confidence ?? {}) as Record<string, unknown>;

  let draft: IntakeDraft = {
    customerName: asString(data.customerName),
    address: asString(data.address),
    serviceLocation: asString(data.serviceLocation, asString(data.address)),
    issueType: asString(data.issueType, asString(data.symptom, "Service request")),
    symptom: asString(data.symptom, "Service call"),
    priority: "P2",
    servicePriority: "normal",
    priorityReasons: [],
    prioritySource: "ai",
    arrivalWindow: asString(data.arrivalWindow, "Pending shop review"),
    dispatchNotes: asString(data.dispatchNotes),
    jobberPasteBlock: asString(data.jobberPasteBlock),
  };

  draft = await applyPriorityAnalysisToDraft(speech.trim(), draft, menuPriority);

  if (
    draft.serviceLocation.toLowerCase() === "unknown" &&
    draft.address.toLowerCase() !== "unknown"
  ) {
    draft.serviceLocation = draft.address;
  }

  const confidence: FieldConfidence = {
    customerName: clampConfidence(confRaw.customerName),
    address: clampConfidence(confRaw.address),
    serviceLocation: clampConfidence(confRaw.serviceLocation),
    issueType: clampConfidence(confRaw.issueType),
  };

  return { draft, confidence };
}
