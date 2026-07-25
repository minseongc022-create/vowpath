import type { AiQueryIntent } from "./intents";

const STOP_WORDS = new Set([
  "what",
  "who",
  "show",
  "find",
  "tell",
  "me",
  "about",
  "the",
  "a",
  "an",
  "is",
  "are",
  "my",
  "our",
  "for",
  "customer",
  "profile",
  "history",
  "고객",
  "찾아",
  "보여",
  "알려",
  "누구",
  "정보",
  "이력",
]);

/** Words that look like short queries, not people names. */
const NON_NAME_TOKENS = new Set([
  "ok",
  "okay",
  "thanks",
  "thank",
  "you",
  "please",
  "help",
  "status",
  "jobs",
  "job",
  "calls",
  "call",
  "today",
  "tomorrow",
  "yesterday",
  "week",
  "schedule",
  "booking",
  "bookings",
  "pending",
  "urgent",
  "how",
  "many",
  "when",
  "where",
  "why",
  "can",
  "could",
  "would",
  "should",
  "need",
  "want",
  "get",
  "got",
  "see",
  "check",
  "list",
  "all",
  "more",
  "info",
  "yes",
  "no",
  "sure",
  "cool",
  "great",
  "good",
  "fine",
  "hello",
  "hi",
  "hey",
  "settings",
  "setup",
  "dispatch",
  "crew",
  "tech",
  "techs",
  "pricing",
  "trial",
  "forwarding",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[?.,!]/g, " ").replace(/\s+/g, " ").trim();
}

function isMutationIntent(q: string): boolean {
  return (
    /\b(turn off|turn on|disable|enable|change|set|switch|add|remove|delete|append|바꿔|변경|추가|삭제|꺼|켜|설정해)\b/i.test(
      q,
    ) || q.includes("로 바꿔") || q.includes("추가해")
  );
}

/** True when the candidate is plausibly a person name, not ops chatter. */
export function looksLikePersonName(candidate: string): boolean {
  const parts = candidate
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/^[^A-Za-z가-힣]+|[^A-Za-z가-힣'-]+$/g, ""))
    .filter(Boolean);
  if (parts.length < 1 || parts.length > 4) return false;
  if (parts.some((p) => NON_NAME_TOKENS.has(p.toLowerCase()) || /\d/.test(p))) return false;

  // Korean given/full names
  if (parts.length === 1 && /^[가-힣]{2,4}$/.test(parts[0])) return true;
  if (parts.every((p) => /^[가-힣]{1,4}$/.test(p)) && parts.join("").length >= 2) return true;

  // Title Case English: "John Smith"
  if (parts.every((p) => /^[A-Z][a-zA-Z'-]+$/.test(p))) return true;

  // Lowercase multi-token names only when 2–3 alpha tokens and none are ops words
  if (
    parts.length >= 2 &&
    parts.length <= 3 &&
    parts.every((p) => /^[a-zA-Z][a-zA-Z'-]*$/.test(p) && p.length >= 2)
  ) {
    return true;
  }

  return false;
}

function extractCustomerName(query: string): string | null {
  const normalized = normalize(query);

  const patterns = [
    /(?:customer|profile|history|show|find|tell me about|who is|lookup)\s+(.+)$/i,
    /(?:고객|이력|찾아|보여)\s*[:\s]+(.+)$/i,
    /([가-힣]{2,8})\s*(?:고객|님|씨)/,
  ];

  for (const pattern of patterns) {
    const m = query.match(pattern);
    const raw = m?.[1]?.trim();
    if (!raw || raw.length < 2) continue;
    const cleaned = raw
      .replace(/\b(customer|profile|history|please|for me)\b/gi, "")
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }

  const tokens = normalized
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  if (tokens.length >= 2 && tokens.length <= 4) {
    const candidate = tokens.join(" ");
    if (!/\d{3,}/.test(candidate) && looksLikePersonName(candidate)) return candidate;
  }
  if (tokens.length === 1 && looksLikePersonName(tokens[0])) {
    return tokens[0];
  }

  // Bare Title Case name with no cue: "Mary Johnson"
  const bare = query.trim();
  if (looksLikePersonName(bare) && bare.split(/\s+/).length >= 2) {
    return bare;
  }

  return null;
}

export function routeAiQuery(query: string): AiQueryIntent {
  const q = normalize(query);
  const raw = query.trim();

  if (q === "__proactive__" || q === "proactive" || q.includes("good morning briefing")) {
    return { kind: "proactive" };
  }

  if (
    /^(hi|hello|hey|yo|howdy|good morning|good afternoon|good evening|sup|what'?s up)[!.?\s]*$/i.test(
      raw.trim(),
    ) ||
    /^(안녕|안녕하세요|하이|헬로)[!.?\s]*$/i.test(raw.trim())
  ) {
    return { kind: "chitchat" };
  }

  if (!isMutationIntent(q)) {
    const customerName = extractCustomerName(raw);
    // Always require a person-shaped name — cues alone must not route "find jobs" to customer.
    if (customerName && looksLikePersonName(customerName)) {
      return { kind: "customer", name: customerName };
    }
  }

  if (
    q.includes("integration") ||
    q.includes("setup") ||
    q.includes("live") ||
    q.includes("연동") ||
    q.includes("설정 완료")
  ) {
    return { kind: "integration_status" };
  }

  if (
    (q.includes("booking mode") ||
      q.includes("scheduling mode") ||
      q.includes("approval mode") ||
      q.includes("승인 모드") ||
      q.includes("예약 모드") ||
      q.includes("설정 보여") ||
      q.includes("show settings") ||
      q.includes("current settings")) &&
    !isMutationIntent(q)
  ) {
    return { kind: "settings_read" };
  }

  if (
    (q.includes("automation rule") ||
      q.includes("workflow rule") ||
      q.includes("운영 규칙") ||
      q.includes("자동화 규칙")) &&
    !isMutationIntent(q)
  ) {
    return { kind: "automation_rules" };
  }

  if (
    q.includes("business hour") ||
    q.includes("holiday") ||
    q.includes("emergency policy") ||
    q.includes("approval policy") ||
    q.includes("instruction") ||
    q.includes("서비스 지역") ||
    q.includes("영업시간") ||
    q.includes("휴일") ||
    q.includes("긴급 정책") ||
    q.includes("승인 정책")
  ) {
    if (!isMutationIntent(q)) return { kind: "policy" };
  }

  if (q.includes("last customer") || q.includes("latest customer") || q.includes("최근 고객") || q.includes("뭐라고 했")) {
    return { kind: "call_memory" };
  }

  if (q.includes("calendar today") || q.includes("today schedule") || q.includes("오늘 일정") || q.includes("오늘 방문")) {
    return { kind: "calendar_today" };
  }

  if (q.includes("calendar") || q.includes("schedule this week") || q.includes("이번 주 일정")) {
    return { kind: "calendar_week" };
  }

  if (q.includes("calls today") || q.includes("how many calls") || q.includes("오늘 통화") || q.includes("통화 몇")) {
    return { kind: "calls_today" };
  }

  if (q.includes("pending") || q.includes("승인 대기") || q.includes("approval waiting")) {
    return { kind: "pending_approvals" };
  }

  if (q.includes("urgent") || q.includes("emergency request") || q.includes("긴급")) {
    if (q.includes("call")) return { kind: "urgent_calls" };
    return { kind: "urgent_requests" };
  }

  if (q.includes("bookings this week") || q.includes("this week booking") || q.includes("이번 주 예약")) {
    return { kind: "bookings_week" };
  }

  if (q.includes("after hours") || q.includes("야간") || q.includes("근무 외")) {
    return { kind: "after_hours" };
  }

  if (q.includes("no cooling") || q.includes("냉방") || q.includes("안 나옴")) {
    return { kind: "no_cooling", lastWeek: q.includes("last week") || q.includes("지난주") };
  }

  if (q.includes("what happened yesterday") || q.includes("yesterday") || q.includes("어제")) {
    return { kind: "yesterday" };
  }

  if (q.includes("busiest day") || q.includes("가장 바쁜")) {
    return { kind: "busiest_day" };
  }

  if (q.includes("high priority") || (q.includes("emergency") && q.includes("call"))) {
    return { kind: "urgent_calls" };
  }

  // Bare person name only — do not route short ops phrases to customer lookup.
  if (looksLikePersonName(raw) && raw.split(/\s+/).length >= 2) {
    return { kind: "customer", name: raw };
  }

  return { kind: "general" };
}

export function isAdminMutationQuery(query: string): boolean {
  return isMutationIntent(normalize(query));
}
