const DEFAULT_TIMEOUT_MS = 20_000;

export type ChatTurn = { role: "user" | "assistant" | "system"; content: string };

export type OpenAiJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

export async function openAiTextCompletion(params: {
  messages: ChatTurn[];
  temperature?: number;
  timeoutMs?: number;
  /** Override model (plan-tiered). Defaults to economy mini. */
  model?: string;
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
        model: params.model ?? process.env.OPENAI_MODEL_ECONOMY ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
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

/**
 * Chat Completions Structured Outputs wrapper.
 *
 * Haruon uses this for decisions that must update application state. A fluent
 * paragraph is not enough there: the model response must match the same shape
 * that the planner and UI consume. Callers still validate semantic ranges
 * before merging values because schema adherence is not factual verification.
 */
export async function openAiStructuredCompletion<T>(params: {
  messages: ChatTurn[];
  name: string;
  schema: OpenAiJsonSchema;
  temperature?: number;
  timeoutMs?: number;
  model?: string;
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
        model: params.model ?? process.env.OPENAI_MODEL_CONCIERGE ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: params.temperature ?? 0.05,
        messages: params.messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: params.name,
            strict: true,
            schema: params.schema,
          },
        },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("OPENAI_TIMEOUT");
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
    choices?: Array<{
      finish_reason?: string;
      message?: { content?: string; refusal?: string | null };
    }>;
  };
  const choice = data.choices?.[0];
  if (choice?.message?.refusal) throw new Error("OPENAI_REFUSAL");
  if (choice?.finish_reason && choice.finish_reason !== "stop") throw new Error("OPENAI_INCOMPLETE_RESPONSE");
  const content = choice?.message?.content?.trim();
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("OPENAI_INVALID_STRUCTURED_RESPONSE");
  }
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type ChatTurnMultimodal = {
  role: "user" | "assistant" | "system";
  content: string | ChatContentPart[];
};

/**
 * 사진을 실제로 보고 판단하는 완성 요청.
 *
 * ★ 왜 따로 두는가
 *
 * 상품 사진이 "아무도 안 살 것 같은 비주얼"인지는 텍스트로는 판단할 수
 * 없다 — 사진 URL이 있다는 사실과 그 사진이 실제로 매력적인지는 다른
 * 정보다. 그래서 이미지를 텍스트에 섞어 보내는 멀티모달 호출을 따로 둔다.
 *
 * ★ 느려도 좋은 모델을 쓴다
 *
 * 이 판단은 자동 소싱 결과를 가르는 값이라, 값싸고 빠른 모델보다 실제로
 * 사진을 잘 읽는 모델이 맞다. 기본을 gpt-4o로 두고, 필요하면
 * OPENAI_MODEL_VISION으로 바꿀 수 있게 한다.
 */
export async function openAiVisionCompletion(params: {
  messages: ChatTurnMultimodal[];
  temperature?: number;
  timeoutMs?: number;
  model?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");

  const controller = new AbortController();
  // 사진 여러 장을 실제로 보고 판단하는 호출이라 텍스트 전용보다 오래
  // 걸릴 수 있다 — 기본 타임아웃을 넉넉히 잡는다.
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 40_000);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model ?? process.env.OPENAI_MODEL_VISION ?? "gpt-4o",
        temperature: params.temperature ?? 0.2,
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
