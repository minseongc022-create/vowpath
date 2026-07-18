import type { ForwardingProviderId } from "@/lib/forwarding-guides-en";
import {
  FORWARDING_PROVIDERS,
  FORWARDING_TROUBLESHOOTING,
  FORWARDING_TROUBLESHOOTING_FALLBACK,
  getForwardingGuideSteps,
} from "@/lib/forwarding-guides-en";
import { openAiTextCompletion, type ChatTurn } from "@/lib/openai-chat";

export const FORWARDING_AI_DAILY_LIMIT = 8;

export function buildForwardingHelpSystemPrompt(
  provider: ForwardingProviderId,
  effiroadNumber: string,
): string {
  const meta = FORWARDING_PROVIDERS.find((p) => p.id === provider);
  const steps = getForwardingGuideSteps(provider, "overflow", effiroadNumber);
  const troubleshooting = FORWARDING_TROUBLESHOOTING[provider];

  return `You are Effiroad's call-forwarding setup expert for US restoration/HVAC shops.

RULES:
- Give short, numbered steps the owner can do RIGHT NOW on their phone or admin portal.
- Never guess carrier codes — only use the verified steps below.
- If iPhone Settings → Call Forwarding is mentioned, warn NEVER to use it (forwards all calls).
- Effiroad number to paste: ${effiroadNumber || "(not provisioned yet)"}
- Current path: ${meta?.label ?? provider} — ${meta?.hint ?? ""}
- Overflow model: shop number rings first ~20 seconds, then Effiroad answers if nobody picks up.
- Dedicated line (effiroad_main): customer dials Effiroad number directly — no star codes.

VERIFIED SETUP STEPS:
${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

TROUBLESHOOTING:
${troubleshooting.map((t) => `- ${t}`).join("\n")}
- ${FORWARDING_TROUBLESHOOTING_FALLBACK}

Reply in the user's language (Korean or English). Max 120 words unless they ask for detail.`;
}

export async function answerForwardingHelpQuestion(params: {
  question: string;
  provider: ForwardingProviderId;
  effiroadNumber: string;
  history: { role: "user" | "assistant"; text: string }[];
}): Promise<string> {
  const system = buildForwardingHelpSystemPrompt(params.provider, params.effiroadNumber);
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
