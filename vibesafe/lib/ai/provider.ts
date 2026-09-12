import "server-only";

/**
 * AI 공급자 추상화.
 *
 * ★ 왜 인터페이스를 한 겹 두는가
 *
 * 분석 로직이 특정 회사의 SDK 모양을 직접 물면, 모델을 바꾸는 일이 "설정 변경"이
 * 아니라 "코드 재작성"이 된다. 이 제품은 검사마다 AI를 부르므로 원가가 곧
 * 생존이고, 더 싼 모델이 나오면 그날 바꿀 수 있어야 한다.
 *
 * 그래서 밖으로 노출하는 건 딱 하나다 — "스키마를 주면 그 모양의 JSON을 준다".
 * 스트리밍도, 도구 호출도, 대화도 필요 없다. 필요해지면 그때 인터페이스를 넓힌다.
 */

export type AiJsonRequest = {
  system: string;
  user: string;
  /** 결과 JSON의 모양. 공급자별로 structured output 기능에 그대로 넘어간다. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxOutputTokens?: number;
};

export interface AiProvider {
  readonly id: string;
  readonly model: string;
  generateJson<T>(request: AiJsonRequest): Promise<T>;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "AI 분석 키가 설정되지 않았습니다. ANTHROPIC_API_KEY 또는 OPENAI_API_KEY를 설정하세요.",
    );
    this.name = "AiNotConfiguredError";
  }
}

export class AiRequestError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AiRequestError";
  }
}

export type AiProviderId = "anthropic" | "openai";

/**
 * 어떤 공급자를 쓸지.
 *
 * `VIBESAFE_AI_PROVIDER`로 못박을 수 있고, 없으면 키가 있는 쪽을 쓴다.
 * 키가 둘 다 있으면 Anthropic이 먼저다 — 긴 코드 묶음을 읽고 구조를 뽑는
 * 작업이라 컨텍스트가 넓은 쪽을 기본으로 둔다.
 */
export function resolveProviderId(): AiProviderId | null {
  const forced = process.env.VIBESAFE_AI_PROVIDER?.trim().toLowerCase();
  if (forced === "anthropic") return process.env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : null;
  if (forced === "openai") return process.env.OPENAI_API_KEY?.trim() ? "openai" : null;
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return null;
}

export function isAiConfigured(): boolean {
  return resolveProviderId() !== null;
}
