import "server-only";

import { AiRequestError, type AiJsonRequest, type AiProvider } from "./provider";

/**
 * OpenAI 어댑터.
 *
 * 이 저장소의 다른 제품들이 이미 fetch로 OpenAI를 부르고 있어 같은 방식을
 * 쓴다(의존성을 하나 더 늘리지 않는다). 여기서 중요한 건 모양이 아니라,
 * 이 파일을 지워도 Anthropic 쪽이 그대로 돈다는 것이다.
 */
/**
 * 엔드포인트를 바꿀 수 있게 둔다.
 *
 * Azure OpenAI, LiteLLM·OpenRouter 같은 프록시, 사내망 게이트웨이, 로컬 모델
 * (Ollama의 OpenAI 호환 엔드포인트) 전부 "OpenAI 모양"을 그대로 쓴다. 주소
 * 하나만 열어두면 그 전부가 코드 수정 없이 붙는다 — 비용을 통제해야 하는
 * 제품에서 이 선택지를 닫아둘 이유가 없다.
 */
function baseUrl(): string {
  const raw = process.env.VIBESAFE_OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  return raw.replace(/\/+$/, "");
}

export function createOpenAiProvider(): AiProvider {
  const model = process.env.VIBESAFE_OPENAI_MODEL?.trim() || "gpt-4o-mini";

  return {
    id: "openai",
    model,
    async generateJson<T>(request: AiJsonRequest): Promise<T> {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) throw new AiRequestError("OPENAI_API_KEY가 없습니다.");

      let res: Response;
      try {
        res = await fetch(`${baseUrl()}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            temperature: 0.1,
            max_tokens: request.maxOutputTokens ?? 8000,
            response_format: {
              type: "json_schema",
              json_schema: { name: request.schemaName, schema: request.schema, strict: false },
            },
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.user },
            ],
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (error) {
        throw new AiRequestError("AI 분석 요청에 실패했습니다.", error);
      }

      if (!res.ok) {
        if (res.status === 401) throw new AiRequestError("AI 인증에 실패했습니다. API 키를 확인해주세요.");
        if (res.status === 429) throw new AiRequestError("AI 요청 한도에 걸렸습니다. 잠시 후 다시 시도해주세요.");
        throw new AiRequestError("AI 분석 요청에 실패했습니다.");
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) throw new AiRequestError("AI가 빈 응답을 반환했습니다.");

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AiRequestError("AI 응답을 읽지 못했습니다.");
      }
    },
  };
}
