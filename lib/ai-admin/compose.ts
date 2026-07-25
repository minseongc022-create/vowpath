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

function greeting(_locale: UiLocale, period: GreetingPeriod, ownerName?: string): string {
  const name = ownerName?.trim();
  const g =
    period === "morning" ? "Good morning" : period === "afternoon" ? "Good afternoon" : "Good evening";
  return name ? `${g}, ${name}.` : `${g}.`;
}

function closing(_locale: UiLocale): string {
  return "Tell me what else you'd like to check and I'll pull it up right away.";
}

export function composeAssistantReply(params: {
  locale?: UiLocale;
  now?: Date;
  ownerName?: string;
  facts: ComposeFacts;
  includeGreeting?: boolean;
  includeClosing?: boolean;
}): string {
  const locale = params.locale ?? runtimeUiLocale();
  const now = params.now ?? new Date();
  const parts: string[] = [];

  if (params.includeGreeting === true) {
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
      "I couldn't find an exact match, so I'm showing the closest related records first.",
    );
  }

  if (params.includeClosing === true) {
    parts.push(closing(locale));
  }
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
  const lines = [
    `I don't have any records for ${params.topic} yet.`,
  ];

  if (params.snapshotLines?.length) {
    lines.push(
      "Here's what I can see for your shop right now:",
      ...params.snapshotLines,
    );
  }

  lines.push("Ask about pending approvals, today's calls, or a customer name and I'll dig in.");
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
  const headline = `${params.label}: ${params.count}.`;
  const bullets = params.context ? [params.context] : undefined;
  return composeAssistantReply({
    locale,
    now: params.now,
    ownerName: params.ownerName,
    facts: { headline, bullets },
  });
}

export function actionLabels(_locale: UiLocale = runtimeUiLocale()) {
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

export function defaultSuggestions(_locale: UiLocale = runtimeUiLocale()): string[] {
  return [
    "What happened yesterday?",
    "Show urgent requests",
    "How many bookings this week?",
    "What did the last customer ask for?",
  ];
}
