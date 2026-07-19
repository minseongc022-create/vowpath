const DEFAULT_TIMEOUT_MS = 15_000;

export async function openAiJsonCompletion<T>(params: {
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
  /** Override model (plan-tiered). Defaults to economy mini. */
  model?: string;
  /** Optional shape check on the parsed JSON — return false/throw to reject a
   *  well-formed-but-wrong-shaped response instead of handing it to the caller as-is. */
  validate?: (value: unknown) => value is T;
}): Promise<T> {
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
        model: params.model ?? process.env.OPENAI_MODEL_ECONOMY ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: params.temperature ?? 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OPENAI_INVALID_JSON");
  }

  if (params.validate && !params.validate(parsed)) {
    throw new Error("OPENAI_SCHEMA_MISMATCH");
  }

  return parsed as T;
}
