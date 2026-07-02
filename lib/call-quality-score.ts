import { withCircuitBreaker, withRetry } from "./resilience";

export type CallQualityResult = {
  score: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are a call-quality auditor for a home-services AI phone intake system.
Given a call transcript and the fields the AI extracted from it, score how well the AI handled the
call from 0-100 (100 = extracted every available fact correctly, correct priority, no missed
red flags; 0 = badly mishandled — e.g. missed a stated emergency, invented details, wrong priority
for what was clearly said). Be strict — a merely "fine" call is 70-85, not 100.
Reply with strict JSON only: {"score": <0-100 integer>, "reasoning": "<one sentence, max 140 chars>"}`;

/**
 * Best-effort AI self-assessment of a finished call. Returns null (never throws) on any
 * failure — this is a nice-to-have dashboard signal, not something that should ever affect
 * the live call flow or get retried aggressively against quota.
 */
export async function scoreCallQuality(params: {
  transcript: string;
  extracted: {
    priority?: string;
    customerName?: string;
    address?: string;
    issueType?: string;
    symptom?: string;
  };
}): Promise<CallQualityResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !params.transcript.trim()) return null;

  try {
    const content = await withCircuitBreaker(
      () =>
        withRetry(
          async () => {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: process.env.OPENAI_MODEL ?? "gpt-4o",
                temperature: 0.1,
                response_format: { type: "json_object" },
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  {
                    role: "user",
                    content: `Transcript:\n${params.transcript.trim()}\n\nAI extracted:\n${JSON.stringify(params.extracted)}`,
                  },
                ],
              }),
            });
            if (!response.ok) throw new Error(`OPENAI_REQUEST_FAILED_${response.status}`);
            const payload = (await response.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            const result = payload.choices?.[0]?.message?.content;
            if (!result) throw new Error("OPENAI_EMPTY_RESPONSE");
            return result;
          },
          { maxAttempts: 2, delayMs: 500, backoff: 2 },
        ),
      "openai",
    );

    const data = JSON.parse(content) as { score?: unknown; reasoning?: unknown };
    const score = Number(data.score);
    if (!Number.isFinite(score)) return null;
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasoning: typeof data.reasoning === "string" ? data.reasoning.slice(0, 200) : "",
    };
  } catch (e) {
    console.warn("[call-quality-score]", e);
    return null;
  }
}
