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

function extractCustomerName(query: string): string | null {
  const normalized = normalize(query);

  const patterns = [
    /(?:customer|profile|history|show|find|tell me about|who is|lookup)\s+(.+)$/i,
    /(?:고객|이력|찾아|보여)\s*[:\s]+(.+)$/i,
    /^([a-z][a-z\s'-]{1,40})$/i,
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
    if (!/\d{3,}/.test(candidate)) return candidate;
  }
  if (tokens.length === 1 && tokens[0].length >= 3 && !/\d/.test(tokens[0])) {
    return tokens[0];
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
    if (
      customerName &&
      (q.includes("customer") ||
        q.includes("profile") ||
        q.includes("history") ||
        q.includes("who") ||
        q.includes("find") ||
        q.includes("show") ||
        q.includes("고객") ||
        q.includes("이력") ||
        /^[a-z가-힣][a-z가-힣\s'-]{1,30}$/i.test(raw.trim()))
    ) {
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

  const fallbackName = extractCustomerName(raw);
  if (fallbackName && fallbackName.split(" ").length <= 3) {
    return { kind: "customer", name: fallbackName };
  }

  return { kind: "general" };
}

export function isAdminMutationQuery(query: string): boolean {
  return isMutationIntent(normalize(query));
}
