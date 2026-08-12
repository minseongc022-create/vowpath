/** Learn-only OpenAI config — isolated from Effiroad dispatch env naming. */

export function getLearnOpenAiKey(): string | undefined {
  return (
    process.env.LEARN_OPENAI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    undefined
  );
}

export function isLearnOpenAiReady(): boolean {
  return Boolean(getLearnOpenAiKey());
}

export function getLearnOpenAiModelEconomy(): string {
  return (
    process.env.LEARN_OPENAI_MODEL ??
    process.env.OPENAI_MODEL_ECONOMY ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini"
  );
}

export function getLearnAuthSecret(): string | undefined {
  return (
    process.env.LEARN_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    (process.env.NEXT_PUBLIC_AUTH_DEMO === "true" ? "lane-learn-demo-secret" : undefined)
  );
}
