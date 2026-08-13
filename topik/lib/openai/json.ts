import { getTopikOpenAiKey, getTopikOpenAiModel } from "@/topik/lib/openai/config";

const DEFAULT_TIMEOUT_MS = 45_000;

export async function topikOpenAiJsonCompletion<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
}): Promise<T> {
  const apiKey = getTopikOpenAiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getTopikOpenAiModel(),
        temperature: params.temperature ?? 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error("OPENAI_REQUEST_FAILED");

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");

    return JSON.parse(content) as T;
  } finally {
    clearTimeout(timeout);
  }
}
