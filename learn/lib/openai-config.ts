/** Shared OpenAI config for EFFIROAD Learn — uses same env vars as main app. */

export function getOpenAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function isLearnOpenAiReady(): boolean {
  return Boolean(getOpenAiKey());
}

export function getOpenAiModelEconomy(): string {
  return (
    process.env.OPENAI_MODEL_ECONOMY ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini"
  );
}

export function getOpenAiModelPremium(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o";
}
