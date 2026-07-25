import { openAiTextCompletion, type ChatTurn } from "@/lib/openai-chat";
import { marketingUiLocale, type UiLocale } from "@/lib/locale";
import { AI_PRIVACY_SYSTEM_RULES } from "@/lib/security/ai-privacy";
import { buildSiteAssistantKnowledge } from "./knowledge";

export type SiteAssistantReply = {
  answer: string;
  suggestions: string[];
};

type AssistantLang = "en" | "es";

const STARTERS_EN = [
  "What is Effiroad?",
  "How does call forwarding work?",
  "What's included in the free trial?",
  "How does auto-dispatch work?",
];

const STARTERS_ES = [
  "¿Qué es Effiroad?",
  "¿Cómo funciona el desvío de llamadas?",
  "¿Qué incluye la prueba gratis?",
  "¿Cómo funciona el auto-despacho?",
];

function resolveLang(locale: UiLocale): AssistantLang {
  if (locale === "es") return "es";
  return "en";
}

function startersFor(lang: AssistantLang): string[] {
  if (lang === "es") return STARTERS_ES;
  return STARTERS_EN;
}

const TRADE_VOICE_EN = `VOICE: Sound like a seasoned restoration/HVAC ops advisor — someone who has dispatched mitigation crews at 2 AM. Confident, direct, respectful. Use trade terms when they help (water loss, Cat-3, on-call, dispatch, mitigation) but keep sentences short and plain. No corporate fluff. Help them grasp the idea fast.`;

const TRADE_VOICE_ES = `VOZ: Habla como un asesor operativo con experiencia en restauración/HVAC — alguien que ha despachado cuadrillas a las 2 AM. Seguro, directo, respetuoso. Usa términos del oficio cuando ayuden (pérdida por agua, Cat-3, guardia, despacho, mitigación) pero en oraciones cortas y claras. Sin rodeos corporativos. Que entiendan rápido.`;

function fallback(locale: UiLocale): SiteAssistantReply {
  const lang = resolveLang(locale);
  return {
    answer:
      lang === "es"
        ? "Ahora no puedo conectar. Visita effiroad.com/pricing o escribe a support@effiroad.com."
        : "I'm having trouble connecting right now. Visit effiroad.com/pricing or email support@effiroad.com.",
    suggestions: startersFor(lang),
  };
}

/** Keep chips as stable starters — scraping answer lines produced odd follow-ups. */
function parseSuggestions(_text: string, lang: AssistantLang): string[] {
  return startersFor(lang);
}

function replyLanguageLine(lang: AssistantLang): string {
  if (lang === "es") return "Reply in Spanish unless the user writes in another language — then match their language.";
  return "Reply in English unless the user writes in another language — then match their language.";
}

export async function answerSiteAssistantQuestion(params: {
  question: string;
  history: { role: "user" | "assistant"; text: string }[];
  locale: UiLocale;
  loggedIn?: boolean;
  marketingOnly?: boolean;
}): Promise<SiteAssistantReply> {
  const { question, history, locale, loggedIn, marketingOnly } = params;
  const lang = resolveLang(locale);

  if (
    /^(hi|hello|hey|yo|howdy|good morning|good afternoon|good evening|sup|what'?s up)[!.?\s]*$/i.test(
      question.trim(),
    ) ||
    /^(hola|buenos días|buenas tardes|buenas noches|qué tal)[!.?\s]*$/i.test(question.trim()) ||
    /^(안녕|안녕하세요|하이|헬로)[!.?\s]*$/i.test(question.trim())
  ) {
    return siteAssistantGreeting(locale, Boolean(loggedIn), Boolean(marketingOnly));
  }

  const knowledge = buildSiteAssistantKnowledge(marketingUiLocale(locale));

  const marketingRules = marketingOnly
    ? `You are on the PUBLIC marketing site assistant — NOT the logged-in shop workspace.
Your ONLY job: explain what Effiroad is, how it works, pricing, trial, and getting started.
Do NOT: change settings, access shop/call/booking data, run dispatches, or give dashboard-specific operational advice.
If the user asks to change settings, view their shop, approve requests, or manage crew — politely say those actions are only in the dashboard after sign-in, and briefly explain the product concept instead.
Never link to /dashboard/settings or other shop admin paths as something they can do from this chat.`
    : loggedIn
      ? "The user IS logged in — you can reference their dashboard and settings paths directly."
      : "The user is browsing the marketing site (not logged in) — guide them to sign up or log in for shop-specific actions.";

  const tradeVoice = lang === "es" ? TRADE_VOICE_ES : TRADE_VOICE_EN;

  const system = `You are Effiroad AI — the friendly product expert for Effiroad.com.
Keep answers concise (2-4 short paragraphs max).
${replyLanguageLine(lang)}
${tradeVoice}

You know everything below about the product. Never invent pricing or features not listed.
${AI_PRIVACY_SYSTEM_RULES}
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
      suggestions: parseSuggestions(answer, lang),
    };
  } catch (e) {
    console.error("[site-assistant]", e);
    return fallback(locale);
  }
}

export function siteAssistantGreeting(
  locale: UiLocale,
  loggedIn: boolean,
  marketingOnly = false,
): SiteAssistantReply {
  const lang = resolveLang(locale);
  const suggestions = startersFor(lang);

  if (marketingOnly) {
    return {
      answer:
        lang === "es"
          ? "¡Hola! Soy Effiroad AI. Pregúntame qué es Effiroad, cómo funciona, precios o la prueba gratis — estoy aquí para ayudarte a entender el producto."
          : "Hi! I'm Effiroad AI. Ask me what Effiroad is, how it works, pricing, or the free trial — I'm here to help you understand the product.",
      suggestions,
    };
  }
  if (loggedIn) {
    return {
      answer:
        lang === "es"
          ? "¡Hola! Soy Effiroad AI. Pregúntame dónde está una configuración, cómo funciona algo o qué pasó hoy en tu taller."
          : "Hi! I'm Effiroad AI. Ask me where a setting lives, how a feature works, or what's happening in your shop today.",
      suggestions,
    };
  }
  return {
    answer:
      lang === "es"
        ? "¡Hola! Soy Effiroad AI. Pregúntame sobre precios, desvío de llamadas, despacho o la prueba gratis."
        : "Hi! I'm Effiroad AI. Ask me about pricing, call forwarding, dispatch, or the free trial — happy to walk you through it.",
    suggestions,
  };
}
