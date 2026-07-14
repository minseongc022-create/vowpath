import { openAiTextCompletion, type ChatTurn } from "@/lib/openai-chat";
import { buildSiteAssistantKnowledge } from "./knowledge";

export type SiteAssistantReply = {
  answer: string;
  suggestions: string[];
};

const STARTERS_EN = [
  "How does call forwarding work?",
  "What's included in the free trial?",
  "Where do I add my crew?",
  "How does auto-dispatch work?",
];

const STARTERS_KO = [
  "착신전환은 어떻게 하나요?",
  "무료 체험에 뭐가 포함돼요?",
  "크루는 어디서 추가하나요?",
  "자동 디스패치는 어떻게 동작해요?",
];

function fallback(locale: "en" | "ko"): SiteAssistantReply {
  return {
    answer:
      locale === "ko"
        ? "지금은 잠시 연결이 어렵습니다. effiroad.com/pricing 또는 support@effiroad.com 으로 문의해 주세요."
        : "I'm having trouble connecting right now. Visit effiroad.com/pricing or email support@effiroad.com.",
    suggestions: locale === "ko" ? STARTERS_KO : STARTERS_EN,
  };
}

function parseSuggestions(text: string, locale: "en" | "ko"): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  const fromAnswer = lines.filter((l) => l.length < 60).slice(0, 3);
  return fromAnswer.length >= 2 ? fromAnswer : locale === "ko" ? STARTERS_KO : STARTERS_EN;
}

export async function answerSiteAssistantQuestion(params: {
  question: string;
  history: { role: "user" | "assistant"; text: string }[];
  locale: "en" | "ko";
  loggedIn?: boolean;
}): Promise<SiteAssistantReply> {
  const { question, history, locale, loggedIn } = params;
  const knowledge = buildSiteAssistantKnowledge();

  const system = `You are Effiroad AI — the friendly product expert for Effiroad.com.
You speak naturally, like a helpful colleague (not a robot). Keep answers concise (2-4 short paragraphs max).
Reply in ${locale === "ko" ? "Korean" : "English"} unless the user writes in another language — then match their language.

You know everything below about the product. Never invent pricing or features not listed.
If asked to change live shop settings and the user is NOT logged in, explain the steps and suggest signing in.
${loggedIn ? "The user IS logged in — you can reference their dashboard and settings paths directly." : "The user is browsing the marketing site (not logged in) — guide them to sign up or log in for shop-specific actions."}

PRODUCT KNOWLEDGE:
${knowledge}`;

  const messages: ChatTurn[] = [
    { role: "system", content: system },
    ...history.slice(-8).map((h) => ({
      role: h.role,
      content: h.text,
    })),
    { role: "user", content: question },
  ];

  try {
    const answer = await openAiTextCompletion({ messages, temperature: 0.35 });
    return {
      answer,
      suggestions: parseSuggestions(answer, locale),
    };
  } catch (e) {
    console.error("[site-assistant]", e);
    return fallback(locale);
  }
}

export function siteAssistantGreeting(locale: "en" | "ko", loggedIn: boolean): SiteAssistantReply {
  if (loggedIn) {
    return {
      answer:
        locale === "ko"
          ? "안녕하세요! Effiroad AI예요. 설정 위치, 기능 사용법, 오늘 통화·예약 현황 — 무엇이든 편하게 물어보세요."
          : "Hi! I'm Effiroad AI. Ask me where a setting lives, how a feature works, or what's happening in your shop today.",
      suggestions: locale === "ko" ? STARTERS_KO : STARTERS_EN,
    };
  }
  return {
    answer:
      locale === "ko"
        ? "안녕하세요! Effiroad AI예요. 가격, 착신전환, 디스패치, 무료 체험 — 궁금한 걸 편하게 물어보세요."
        : "Hi! I'm Effiroad AI. Ask me about pricing, call forwarding, dispatch, or the free trial — happy to walk you through it.",
    suggestions: locale === "ko" ? STARTERS_KO : STARTERS_EN,
  };
}
