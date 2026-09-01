import { openAiTextCompletion } from "@/lib/openai-chat";
import type { DajeongPlan } from "./types";

function cleanOneLine(value: string): string | null {
  const cleaned = value.replace(/[\r\n]+/g, " ").replace(/[<>]/g, "").trim();
  if (cleaned.length < 12 || cleaned.length > 110) return null;
  return cleaned;
}

/**
 * AI is allowed to improve only the emotional framing. Prices, vendors and
 * booking state remain deterministic so a fluent model response can never
 * fabricate availability or spend the user's money.
 */
export async function personalizePlanSummary(plan: DajeongPlan): Promise<DajeongPlan> {
  if (!process.env.OPENAI_API_KEY) return plan;
  try {
    const response = await openAiTextCompletion({
      timeoutMs: 5_000,
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: "너는 한국어 기념일 플래너다. 과장, 예약 완료 주장, 새 사실 추가 없이 따뜻하고 구체적인 한 문장만 쓴다. 따옴표와 이모지는 쓰지 않는다.",
        },
        {
          role: "user",
          content: `상황: ${plan.sourceRequest}\n대상: ${plan.situation.recipient}\n날짜: ${plan.situation.targetDate}\n지역: ${plan.situation.region}\n구성: ${plan.items.map((item) => item.title).join(", ")}\n이 계획의 의도를 70자 이내 한 문장으로 설명해줘.`,
        },
      ],
    });
    const summary = cleanOneLine(response);
    return summary ? { ...plan, summary } : plan;
  } catch {
    return plan;
  }
}

