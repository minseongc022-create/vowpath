import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { AiRequestError, type AiJsonRequest, type AiProvider } from "./provider";

/**
 * Anthropic 어댑터.
 *
 * 모델은 환경변수로 바꿀 수 있다 — 저장소 분석은 한 프로젝트당 몇 번 안 돌지만
 * 사용자가 늘면 여기가 제일 먼저 비용이 되는 자리다.
 */
export function createAnthropicProvider(): AiProvider {
  const model = process.env.VIBESAFE_ANTHROPIC_MODEL?.trim() || "claude-opus-5";
  const client = new Anthropic();

  return {
    id: "anthropic",
    model,
    async generateJson<T>(request: AiJsonRequest): Promise<T> {
      let response;
      try {
        response = await client.messages.create({
          model,
          max_tokens: request.maxOutputTokens ?? 8000,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          output_config: {
            format: { type: "json_schema", schema: request.schema },
          },
        });
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          throw new AiRequestError("AI 인증에 실패했습니다. API 키를 확인해주세요.", error);
        }
        if (error instanceof Anthropic.RateLimitError) {
          throw new AiRequestError("AI 요청 한도에 걸렸습니다. 잠시 후 다시 시도해주세요.", error);
        }
        throw new AiRequestError("AI 분석 요청에 실패했습니다.", error);
      }

      // 안전 거절은 예외가 아니라 200으로 온다 — content를 읽기 전에 확인한다.
      if (response.stop_reason === "refusal") {
        throw new AiRequestError("AI가 이 저장소 분석을 거절했습니다.");
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      if (!text.trim()) throw new AiRequestError("AI가 빈 응답을 반환했습니다.");

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new AiRequestError("AI 응답을 읽지 못했습니다.");
      }
    },
  };
}
