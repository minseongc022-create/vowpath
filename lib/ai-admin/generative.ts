import { openAiTextCompletion } from "../openai-chat";
import type { EffiroadAiResponse } from "../effiroad-ai-query";
import type { AiContextPack } from "./context-pack";
import { snapshotLines } from "./context-pack";
import { actionLabels, defaultSuggestions } from "./compose";
import type { ChatTurn } from "./conversation-followup";

const SYSTEM = `You are Effiroad AI, the in-dashboard assistant for a US restoration or HVAC shop owner.
Be concise, warm, and practical — like a sharp ops manager who knows their dashboard.
Use only the shop data provided. Never invent bookings, calls, phones, or settings.
Never share passwords, API keys, other tenants' data, or claim you can place phone calls yourself.
If you don't know, say so and point them to Settings, Calendar, or Requests.
Answer in clear US English. Prefer short paragraphs and bullets when listing.
When suggesting next steps, keep them actionable.`;

function packSummary(pack: AiContextPack): string {
  const lines = [
    `Shop: ${pack.shopName || pack.ownerName || "Shop"}`,
    ...snapshotLines(pack).slice(0, 12),
    `Pending approvals: ${pack.snapshot.pendingCount}`,
    `Urgent: ${pack.snapshot.urgentCount}`,
    `Calls in range: ${pack.calls.length}`,
    `Bookings in range: ${pack.bookings.length}`,
  ];
  const recent = pack.bookings.slice(0, 8).map(
    (b) =>
      `- ${b.customerName} | ${b.issueType} | ${b.status} | ${b.arrivalWindow ?? "no window"}`,
  );
  if (recent.length) {
    lines.push("Recent requests:", ...recent);
  }
  return lines.join("\n");
}

/**
 * Conversational LLM answer for open-ended shop questions.
 * Returns null if OpenAI is unavailable so callers can fall back to templates.
 */
export async function generateShopAiReply(params: {
  query: string;
  pack: AiContextPack;
  history?: ChatTurn[];
}): Promise<EffiroadAiResponse | null> {
  const { query, pack, history = [] } = params;
  try {
    const historyTurns = history.slice(-8).map((t) => ({
      role: t.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: t.text.slice(0, 800),
    }));

    const content = await openAiTextCompletion({
      temperature: 0.35,
      timeoutMs: 12_000,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "system",
          content: `SHOP DATA (authoritative):\n${packSummary(pack)}`,
        },
        ...historyTurns,
        { role: "user", content: query.slice(0, 1200) },
      ],
    });

    const L = actionLabels(pack.locale);
    return {
      answer: content.trim(),
      actions: [
        { label: L.pendingApprovals, href: "/dashboard/bookings" },
        { label: L.calendar, href: "/dashboard/calendar" },
        { label: L.recentCalls, href: "/dashboard/missed-calls" },
        { label: L.openSettings, href: "/dashboard/settings" },
      ],
      suggestions: defaultSuggestions(pack.locale),
    };
  } catch {
    return null;
  }
}
