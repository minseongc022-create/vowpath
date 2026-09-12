import "server-only";

import { createAnthropicProvider } from "./anthropic";
import { createOpenAiProvider } from "./openai";
import { AiNotConfiguredError, resolveProviderId, type AiProvider } from "./provider";

export { AiNotConfiguredError, AiRequestError, isAiConfigured } from "./provider";
export type { AiProvider, AiJsonRequest } from "./provider";

/** 분석 코드가 AI에 닿는 유일한 문. 여기 말고 어디서도 SDK를 import하지 않는다. */
export function getAiProvider(): AiProvider {
  const id = resolveProviderId();
  if (id === "anthropic") return createAnthropicProvider();
  if (id === "openai") return createOpenAiProvider();
  throw new AiNotConfiguredError();
}
