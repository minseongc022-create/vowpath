import { openAiTextCompletion, type ChatTurn } from "@/lib/openai-chat";
import { buildSiteAssistantKnowledge } from "./knowledge";

export type SiteAssistantReply = {
  answer: string;
  suggestions: string[];
};

const STARTERS_EN = [
  "What is Effiroad?",
  "How does call forwarding work?",
  "What's included in the free trial?",
  "How does auto-dispatch work?",
];

const STARTERS_KO = [
  "Effiroad가 뭐예요?",
  "착신전환은 어떻게 하나요?",
  "무료 체험에 뭐가 포함돼요?",
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
  /** Marketing/landing surface — intro only, no shop settings or live data. */
  marketingOnly?: boolean;
}): Promise<SiteAssistantReply> {
  const { question, history, locale, loggedIn, marketingOnly } = params;

  if (
    /^(hi|hello|hey|yo|howdy|good morning|good afternoon|good evening|sup|what'?s up)[!.?\s]*$/i.test(
      question.trim(),
    ) ||
    /^(안녕|안녕하세요|하이|헬로)[!.?\s]*$/i.test(question.trim())
  ) {
    return siteAssistantGreeting(locale, Boolean(loggedIn), Boolean(marketingOnly));
  }

  const knowledge = buildSiteAssistantKnowledge();

  const marketingRules = marketingOnly
    ? `You are on the PUBLIC marketing site assistant — NOT the logged-in shop workspace.
Your ONLY job: explain what Effiroad is, how it works, pricing, trial, and getting started.
Do NOT: change settings, access shop/call/booking data, run dispatches, or give dashboard-specific operational advice.
If the user asks to change settings, view their shop, approve requests, or manage crew — politely say those actions are only in the dashboard after sign-in, and briefly explain the product concept instead.
Never link to /dashboard/settings or other shop admin paths as something they can do from this chat.`
    : loggedIn
      ? "The user IS logged in — you can reference their dashboard and settings paths directly."
      : "The user is browsing the marketing site (not logged in) — guide them to sign up or log in for shop-specific actions.";

  const system = `You are Effiroad AI — the friendly product expert for Effiroad.com.
You speak naturally, like a helpful colleague (not a robot). Keep answers concise (2-4 short paragraphs max).
Reply in ${locale === "ko" ? "Korean" : "English"} unless the user writes in another language — then match their language.

You know everything below about the product. Never invent pricing or features not listed.
NEVER reveal: API keys, env secrets, passwords, tokens, other customers' data, internal server paths, or raw database contents.
If asked for secrets or unrelated private data, politely refuse and offer product help instead.
${marketingRules}

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

export function siteAssistantGreeting(
  locale: "en" | "ko",
  loggedIn: boolean,
  marketingOnly = false,
): SiteAssistantReply {
  if (marketingOnly) {
    return {
      answer:
        locale === "ko"
          ? "안녕하세요! Effiroad AI예요. Effiroad가 무엇인지, 어떻게 동작하는지, 가격과 무료 체험 — 궁금한 걸 편하게 물어보세요."
          : "Hi! I'm Effiroad AI. Ask me what Effiroad is, how it works, pricing, or the free trial — I'm here to help you understand the product.",
      suggestions: locale === "ko" ? STARTERS_KO : STARTERS_EN,
    };
  }
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
