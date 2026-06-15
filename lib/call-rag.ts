import type { CallMemoryRecord } from "./call-memory";
import type { CallRecord } from "./operations-analytics";

export type CallRagHit = {
  id: string;
  score: number;
  customerName: string;
  issue: string;
  summary: string;
  phone?: string;
  createdAt: string;
  source: "memory" | "call";
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function scoreText(query: string, haystack: string): number {
  const q = tokenize(query);
  if (!q.length) return 0;
  const h = haystack.toLowerCase();
  let hits = 0;
  for (const token of q) {
    if (h.includes(token)) hits += 1;
  }
  return hits / q.length;
}

export function searchCallRag(params: {
  query: string;
  callMemory: CallMemoryRecord[];
  calls: CallRecord[];
  limit?: number;
}): CallRagHit[] {
  const limit = params.limit ?? 8;
  const hits: CallRagHit[] = [];

  for (const m of params.callMemory) {
    const haystack = [m.customerName, m.issue, m.summary, m.phoneNumber].join(" ");
    const score = scoreText(params.query, haystack);
    if (score <= 0) continue;
    hits.push({
      id: m.id,
      score,
      customerName: m.customerName,
      issue: m.issue,
      summary: m.summary,
      phone: m.phoneNumber,
      createdAt: m.createdAt,
      source: "memory",
    });
  }

  for (const c of params.calls) {
    const haystack = [
      c.customerName,
      c.symptom,
      c.issueType,
      c.transcript,
      c.aiSummary,
      c.from,
    ]
      .filter(Boolean)
      .join(" ");
    const score = scoreText(params.query, haystack);
    if (score <= 0) continue;
    hits.push({
      id: c.id,
      score,
      customerName: c.customerName ?? "Unknown",
      issue: c.symptom ?? c.issueType ?? "Call",
      summary: c.aiSummary?.trim() || c.transcript?.slice(0, 200) || "No summary",
      phone: c.callbackPhone ?? c.from,
      createdAt: c.createdAt,
      source: "call",
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
