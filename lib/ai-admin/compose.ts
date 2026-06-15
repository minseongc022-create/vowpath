import { runtimeUiLocale, type UiLocale } from "../locale";

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export type ComposeFacts = {
  headline: string;
  bullets?: string[];
  partial?: boolean;
};

export function greetingPeriod(now: Date): GreetingPeriod {
  const h = now.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function greeting(locale: UiLocale, period: GreetingPeriod, ownerName?: string): string {
  const name = ownerName?.trim();
  if (locale === "ko") {
    const g =
      period === "morning" ? "좋은 아침입니다" : period === "afternoon" ? "안녕하세요" : "좋은 저녁입니다";
    return name ? `${g}, ${name}님.` : `${g}, 사장님.`;
  }
  const g =
    period === "morning" ? "Good morning" : period === "afternoon" ? "Good afternoon" : "Good evening";
  return name ? `${g}, ${name}.` : `${g}.`;
}

function closing(locale: UiLocale): string {
  return locale === "ko"
    ? "추가로 확인할 내용을 말씀해 주시면 바로 보여드리겠습니다, 사장님."
    : "Tell me what else you'd like to check and I'll pull it up right away.";
}

export function composeAssistantReply(params: {
  locale?: UiLocale;
  now?: Date;
  ownerName?: string;
  facts: ComposeFacts;
  includeGreeting?: boolean;
}): string {
  const locale = params.locale ?? runtimeUiLocale();
  const now = params.now ?? new Date();
  const parts: string[] = [];

  if (params.includeGreeting !== false) {
    parts.push(greeting(locale, greetingPeriod(now), params.ownerName));
  }

  parts.push(params.facts.headline);

  if (params.facts.bullets?.length) {
    for (const line of params.facts.bullets) {
      parts.push(`• ${line}`);
    }
  }

  if (params.facts.partial) {
    parts.push(
      locale === "ko"
        ? "정확히 일치하는 기록은 없었지만, 관련 데이터를 먼저 보여드렸습니다."
        : "I couldn't find an exact match, so I'm showing the closest related records first.",
    );
  }

  parts.push(closing(locale));
  return parts.join("\n\n");
}

export function composeEmptyResult(params: {
  locale?: UiLocale;
  now?: Date;
  ownerName?: string;
  topic: string;
  snapshotLines?: string[];
  suggestions?: string[];
}): string {
  const locale = params.locale ?? runtimeUiLocale();
  const now = params.now ?? new Date();
  const lines = [
    greeting(locale, greetingPeriod(now), params.ownerName),
    locale === "ko"
      ? `${params.topic}에 대한 기록은 아직 없습니다.`
      : `I don't have any records for ${params.topic} yet.`,
  ];

  if (params.snapshotLines?.length) {
    lines.push(
      locale === "ko" ? "대신 지금 샵 상태입니다:" : "Here's what I can see for your shop right now:",
      ...params.snapshotLines,
    );
  }

  lines.push(closing(locale));
  return lines.join("\n\n");
}

export function composeCountReply(params: {
  locale?: UiLocale;
  now?: Date;
  ownerName?: string;
  label: string;
  count: number;
  context?: string;
}): string {
  const locale = params.locale ?? runtimeUiLocale();
  const headline =
    locale === "ko"
      ? `${params.label}은(는) ${params.count}건입니다.`
      : `${params.label}: ${params.count}.`;
  const bullets = params.context ? [params.context] : undefined;
  return composeAssistantReply({
    locale,
    now: params.now,
    ownerName: params.ownerName,
    facts: { headline, bullets },
  });
}

export function actionLabels(locale: UiLocale = runtimeUiLocale()) {
  if (locale === "ko") {
    return {
      pendingApprovals: "승인 대기 보기",
      urgentRequests: "긴급 요청 보기",
      customerHistory: "고객 기록",
      recentCalls: "통화 기록 보기",
      weekBookings: "이번 주 예약",
      calendar: "캘린더 보기",
      bookingDetails: "예약 상세 보기",
      callHistory: "통화 기록 보기",
      openJobber: "Jobber 열기",
      approve: "승인",
      decline: "거절",
      openSettings: "연동 설정",
      editMemory: "AI 메모리 수정",
      billingPortal: "결제 포털",
    };
  }
  return {
    pendingApprovals: "View pending approvals",
    urgentRequests: "View urgent requests",
    customerHistory: "Customer history",
    recentCalls: "View call history",
    weekBookings: "This week's bookings",
    calendar: "Open calendar",
    bookingDetails: "View booking details",
    callHistory: "View call history",
    openJobber: "Open Jobber",
    approve: "Approve",
    decline: "Decline",
    openSettings: "Integration settings",
    editMemory: "Edit AI memory",
    billingPortal: "Billing portal",
  };
}

export function defaultSuggestions(locale: UiLocale = runtimeUiLocale()): string[] {
  if (locale === "ko") {
    return [
      "어제 무슨 일 있었어?",
      "긴급 요청 보여줘",
      "이번 주 예약 몇 건이야?",
      "마지막 고객이 뭐라고 했지?",
    ];
  }
  return [
    "What happened yesterday?",
    "Show urgent requests",
    "How many bookings this week?",
    "What did the last customer ask for?",
  ];
}
