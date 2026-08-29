/**
 * hookable-engine 전용 OpenAI 호출 헬퍼 — toss-shop의 fetch 헬퍼를 공유하지 않고
 * 이 모듈 안에서 독립적으로 재구현한다 (완전 격리 원칙).
 */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * JSON 모드로 OpenAI에 프롬프트를 보내고 파싱된 객체를 돌려준다.
 * 키가 없거나 호출/파싱이 실패하면 null — 호출부는 항상 휴리스틱 폴백을 갖는다.
 */
export async function requestJson<T>(prompt: string, opts?: { temperature?: number }): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.HOOKABLE_ENGINE_OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: opts?.temperature ?? 0.5,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
