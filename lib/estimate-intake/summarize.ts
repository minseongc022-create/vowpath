import type { EstimateAnswers } from "./types";

function fallbackSummary(answers: EstimateAnswers): string {
  const parts = [answers.damageType, answers.address].filter(Boolean);
  return parts.length ? parts.join(" at ") : "Estimate request — details on file.";
}

/**
 * Cleans up the six raw spoken answers into one tight sentence for the owner's text
 * alert. Never throws — falls back to a plain template if the model call fails, since
 * this runs after the caller has already hung up and must not block the SMS.
 */
export async function summarizeEstimateRequest(answers: EstimateAnswers): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackSummary(answers);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Write one concise sentence, under 200 characters, summarizing a free-estimate " +
              "phone request for a US home services dispatcher reading it in a text message. " +
              "Plain text only — no markdown, no quotes. Lead with the damage/issue type and " +
              "the address. Mention when it was noticed and the caller's preferred day/time if given.",
          },
          {
            role: "user",
            content:
              `Address: ${answers.address ?? "Unknown"}\n` +
              `Damage type: ${answers.damageType ?? "Unknown"}\n` +
              `First noticed: ${answers.noticedWhen ?? "Unknown"}\n` +
              `Preferred day/time: ${answers.preferredTime ?? "Unknown"}`,
          },
        ],
      }),
    });

    if (!response.ok) return fallbackSummary(answers);

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || fallbackSummary(answers);
  } catch (e) {
    console.warn("[estimate-intake] summarize failed", e);
    return fallbackSummary(answers);
  }
}
