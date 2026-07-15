import type { UiLocale } from "@/lib/locale";

export type ExamplePrompt = { icon: string; label: string; question: string };

const EXAMPLES_PUBLIC_EN: ExamplePrompt[] = [
  { icon: "✨", label: "What is Effiroad?", question: "What is Effiroad and who is it for?" },
  { icon: "📞", label: "How calls work", question: "How does 24/7 call answering work?" },
  { icon: "🚚", label: "Auto-dispatch", question: "How does auto-dispatch work?" },
  { icon: "💰", label: "Pricing & trial", question: "Explain pricing and the free trial" },
];

const EXAMPLES_PUBLIC_ES: ExamplePrompt[] = [
  { icon: "✨", label: "¿Qué es Effiroad?", question: "¿Qué es Effiroad y para quién es?" },
  { icon: "📞", label: "Cómo contesta", question: "¿Cómo funciona la contestación 24/7?" },
  { icon: "🚚", label: "Auto-despacho", question: "¿Cómo funciona el auto-despacho?" },
  { icon: "💰", label: "Precios y prueba", question: "Explícame precios y la prueba gratis" },
];

const EXAMPLES_PUBLIC_KO: ExamplePrompt[] = [
  { icon: "✨", label: "Effiroad 소개", question: "Effiroad가 뭐고 누구를 위한 서비스인가요?" },
  { icon: "📞", label: "통화 응대", question: "24시간 전화 응대는 어떻게 동작하나요?" },
  { icon: "🚚", label: "자동 디스패치", question: "자동 디스패치는 어떻게 되나요?" },
  { icon: "💰", label: "요금·체험", question: "요금제와 무료 체험 알려줘" },
];

export function getPublicExamplePrompts(locale: UiLocale): ExamplePrompt[] {
  if (locale === "es") return EXAMPLES_PUBLIC_ES;
  return EXAMPLES_PUBLIC_EN;
}

export function getAssistantWidgetCopy(locale: UiLocale, displayName: string, useShopAi: boolean) {
  if (locale === "es") {
    return {
      name: "Effiroad AI",
      hint: useShopAi
        ? "Toca el botón de IA — pregunta sobre configuración, llamadas o tu taller."
        : "Toca aquí — conoce Effiroad, precios y cómo empezar.",
      headline: useShopAi
        ? displayName
          ? `Hola, ${displayName.split(" ")[0]}`
          : "¿En qué te ayudo?"
        : "¿Preguntas sobre Effiroad?",
      placeholder: useShopAi ? "Pregunta lo que quieras" : "Pregunta sobre Effiroad…",
      close: "Cerrar",
      open: "Abrir Effiroad AI",
      thinking: "Pensando…",
      thinkingBackground: "Effiroad AI está respondiendo…",
      fullAi: "Abrir espacio completo",
      newReply: "Nueva respuesta",
      examples: "Ejemplos",
      send: "Enviar",
      errorRetry: "Inténtalo de nuevo en un momento.",
      errorGeneric: "Algo salió mal. Inténtalo de nuevo.",
      errorLoad: "No pude cargar eso ahora.",
    };
  }
  return {
    name: "Effiroad AI",
    hint: useShopAi
      ? "Tap the AI button — ask about setup, calls, or your shop."
      : "Tap here — learn how Effiroad works, pricing, and getting started.",
    headline: useShopAi
      ? displayName
        ? `Hi ${displayName.split(" ")[0]}`
        : "What's on your mind?"
      : "Questions about Effiroad?",
    placeholder: useShopAi ? "Ask anything" : "Ask about Effiroad…",
    close: "Close",
    open: "Open Effiroad AI",
    thinking: "Thinking…",
    thinkingBackground: "Effiroad AI is replying…",
    fullAi: "Open full workspace",
    newReply: "New AI reply",
    examples: "Examples",
    send: "Send",
    errorRetry: "Try again in a moment.",
    errorGeneric: "Something went wrong. Please try again.",
    errorLoad: "I couldn't load that right now.",
  };
}
