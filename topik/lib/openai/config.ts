export function getTopikOpenAiKey(): string | undefined {
  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function isTopikOpenAiReady(): boolean {
  return Boolean(getTopikOpenAiKey());
}

export function getTopikOpenAiModel(): string {
  return process.env.TOPIK_OPENAI_MODEL?.trim() || "gpt-4o-mini";
}
