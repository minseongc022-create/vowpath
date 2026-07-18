import type { ForwardingProviderId } from "./forwarding-guides-en";
import {
  forwardingTroubleshooting,
  getForwardingGuideSteps,
} from "./forwarding-guides";
import type { UiLocale } from "./locale";
import { openAiTextCompletion, type ChatTurn } from "./openai-chat";

export const FORWARDING_AI_DAILY_LIMIT = 8;

export function buildForwardingHelpSystemPrompt(
  provider: ForwardingProviderId,
  effiroadNumber: string,
  locale: UiLocale = "en",
): string {
  const steps = getForwardingGuideSteps(provider, "overflow", effiroadNumber, locale);
  const troubleshooting = forwardingTroubleshooting(provider, locale);
  const providerLabel =
    locale === "ko"
      ? {
          effiroad_main: "Effiroad 전용번호",
          dialpad: "Dialpad / Jobber Phone",
          google_voice: "Google Voice",
          att: "AT&T",
          tmobile: "T-Mobile",
          verizon: "Verizon",
          xfinity: "Xfinity Mobile",
          ringcentral: "RingCentral",
          grasshopper: "Grasshopper",
        }[provider]
      : provider;

  return `You are Effiroad's call-forwarding setup expert for US restoration/HVAC shops.

RULES:
- Give short, numbered steps the owner can do RIGHT NOW on their phone or admin portal.
- Never guess carrier codes — only use the verified steps below.
- If iPhone Settings → Call Forwarding is mentioned, warn NEVER to use it (forwards all calls).
- Effiroad number to paste: ${effiroadNumber || "(not provisioned yet)"}
- Current path: ${providerLabel}
- Overflow model: shop number rings first ~20 seconds, then Effiroad answers if nobody picks up.
- Dedicated line (effiroad_main): customer dials Effiroad number directly — no star codes.

VERIFIED SETUP STEPS:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

TROUBLESHOOTING:
${troubleshooting.map((t) => `- ${t}`).join("\n")}

Reply in the user's language (Korean or English). Max 120 words unless they ask for detail.`;
}

export async function answerForwardingHelpQuestion(params: {
  question: string;
  provider: ForwardingProviderId;
  effiroadNumber: string;
  history: { role: "user" | "assistant"; text: string }[];
  locale?: UiLocale;
}): Promise<string> {
  const system = buildForwardingHelpSystemPrompt(
    params.provider,
    params.effiroadNumber,
    params.locale ?? "en",
  );
  const messages: ChatTurn[] = [
    { role: "system", content: system },
    ...params.history.slice(-4).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.text,
    })),
    { role: "user", content: params.question.trim() },
  ];

  return openAiTextCompletion({ messages, temperature: 0.25, timeoutMs: 18_000 });
}
