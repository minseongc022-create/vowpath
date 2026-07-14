const DEFAULT_TIMEOUT_MS = 20_000;

export type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

export async function openAiTextCompletion(params: {
  messages: ChatTurn[];
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: params.temperature ?? 0.4,
        messages: params.messages,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error("OPENAI_TIMEOUT");
    throw new Error("OPENAI_REQUEST_FAILED");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error("OPENAI_INVALID_KEY");
    if (res.status === 429) throw new Error("OPENAI_INSUFFICIENT_QUOTA");
    throw new Error("OPENAI_REQUEST_FAILED");
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");
  return content;
}
