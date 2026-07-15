import type { CompanyAiMemory } from "../company-ai-memory";
import type { PlanId } from "../constants";
import { sitePricing } from "../site-content";
import type { ShopBookingSettings } from "../booking-settings";
import type { ShopProfile } from "../shop-profile-db";
import type { UserRecord } from "../users-db";
import { mergeUserBilling } from "../billing";
import { composeAssistantReply } from "./compose";
import { runtimeUiLocale, type UiLocale } from "../locale";
import { isAdminMutationQuery } from "./router";
import { isWorkflowMutationQuery } from "./workflow-parse";
import type {
  AiAdminAnalysisResult,
  AiAdminBillingAction,
  AiAdminExecutableAction,
  AiAdminPreview,
  CompanyMemoryField,
} from "./types";
import { mightBeClosureRelated } from "./closure-intent";

export type AiAdminContext = {
  companyMemory: CompanyAiMemory;
  bookingSettings: ShopBookingSettings;
  shopProfile: ShopProfile;
  user: UserRecord;
  nextBillingDate?: string | null;
  locale?: UiLocale;
};

const FIELD_LABELS: Record<CompanyMemoryField, string> = {
  serviceAreas: "Service Areas",
  businessHours: "Business Hours",
  holidayRules: "Holiday Rules",
  emergencyPolicy: "Emergency Policy",
  approvalPolicy: "Approval Policy",
  specialInstructions: "Special Instructions",
  customGreeting: "Call Greeting",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function preview(
  title: string,
  message: string,
  action: AiAdminExecutableAction,
  rows?: AiAdminPreview["rows"],
): AiAdminAnalysisResult {
  return {
    kind: "preview",
    answer: message,
    preview: {
      id: crypto.randomUUID(),
      title,
      message,
      risk: "medium",
      confirmLabel: "Confirm",
      cancelLabel: "Cancel",
      rows,
      action,
    },
    suggestions: [
      "Turn off morning SMS report.",
      "Change SMS report to 6:30 AM.",
      "Add Plano to service areas.",
      "Switch booking mode to manual approval.",
    ],
  };
}

function previewL(
  _locale: UiLocale,
  title: string,
  messageEn: string,
  _messageKo: string,
  action: AiAdminExecutableAction,
  rows?: AiAdminPreview["rows"],
): AiAdminAnalysisResult {
  return preview(title, messageEn, action, rows);
}

function blocked(answer: string, rows?: { label: string; value: string }[]): AiAdminAnalysisResult {
  return {
    kind: "blocked",
    answer,
    rows,
    suggestions: [
      "Show my plan.",
      "Compare Flex and Unlimited.",
      "Open billing portal.",
    ],
  };
}

function parseTime(text: string): string | null {
  const q = normalize(text).replace(/분/g, "");
  const match = q.match(/(오전|오후|am|pm)?\s*(\d{1,2})(?:\s*(?:시|:)\s*(\d{1,2}|반))?\s*(오전|오후|am|pm)?/i);
  if (!match) return null;
  let hour = Number(match[2]);
  const meridiem = match[1] || match[4] || "";
  let minute = match[3] === "반" ? 30 : Number(match[3] ?? 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0;
  if ((meridiem === "pm" || meridiem === "오후") && hour < 12) hour += 12;
  if ((meridiem === "am" || meridiem === "오전") && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime(time: string): string {
  const [hRaw, mRaw] = time.split(":");
  const hour = Number(hRaw);
  const minute = Number(mRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function extractAfterKeyword(query: string, keywords: string[]): string | null {
  const original = query.trim();
  const lower = original.toLowerCase();
  for (const keyword of keywords) {
    const idx = lower.indexOf(keyword.toLowerCase());
    if (idx >= 0) {
      const value = original.slice(idx + keyword.length).replace(/^(to|as|에|으로|로|:)\s*/i, "").trim();
      return value || null;
    }
  }
  return null;
}

function extractArea(query: string): string | null {
  const koServiceAreaMatch =
    query.match(/서비스\s*지역(?:에|으로)?\s*([가-힣a-zA-Z][가-힣a-zA-Z\s-]{1,40}?)\s*(?:추가|넣어|삭제|빼줘|제거)/i) ??
    query.match(/([가-힣a-zA-Z][가-힣a-zA-Z\s-]{1,40}?)\s*를?\s*서비스\s*지역(?:에|에서)?\s*(?:추가|넣어|삭제|빼줘|제거)/i);
  if (koServiceAreaMatch?.[1]) return koServiceAreaMatch[1].trim();

  const addMatch =
    query.match(/(?:add|include)\s+([a-zA-Z][a-zA-Z\s-]{1,40})(?:\s+to\s+service|\s+to\s+area|$)/i) ??
    query.match(/([가-힣a-zA-Z][가-힣a-zA-Z\s-]{1,40})\s*(?:추가|넣어)/i);
  const removeMatch =
    query.match(/(?:remove|delete)\s+([a-zA-Z][a-zA-Z\s-]{1,40})(?:\s+from\s+service|\s+from\s+area|$)/i) ??
    query.match(/([가-힣a-zA-Z][가-힣a-zA-Z\s-]{1,40})\s*(?:삭제|빼줘|제거)/i);
  const raw = addMatch?.[1] ?? removeMatch?.[1] ?? null;
  if (!raw) return null;
  return raw.replace(/\s*(서비스\s*지역|service areas?|area)$/i, "").trim();
}

function currentPlanRows(user: UserRecord, nextBillingDate?: string | null) {
  const billing = mergeUserBilling(user);
  const rows = [
    { label: "Current Plan", value: billing.plan ?? "No paid plan" },
    { label: "Subscription Status", value: billing.subscriptionStatus ?? "none" },
    { label: "Approved Flex Usage", value: String(billing.flexBillableCount ?? 0) },
    { label: "Paid At", value: billing.paidAt ? new Date(billing.paidAt).toLocaleDateString("en-US") : "No data" },
  ];
  if (nextBillingDate) {
    rows.push({ label: "Next Billing Date", value: nextBillingDate });
  }
  return rows;
}

function planCard(plan: PlanId): AiAdminAnalysisResult {
  const target = sitePricing.plans.find((item) => item.id === plan) ?? sitePricing.plans[0];
  const actions: AiAdminBillingAction[] = [
    { label: `Open ${target.name} Checkout`, href: `/api/checkout?plan=${target.id}`, kind: "checkout" },
    { label: "Compare Plans", href: "/pricing", kind: "compare" },
  ];
  return {
    kind: "billing",
    answer: `${target.name} checkout is handled by Paddle. I can open the official checkout page, but I cannot process payment inside chat.`,
    billingCard: {
      title: `${target.name} Plan`,
      description: target.description,
      rows: [
        { label: "Price", value: `${target.price}${target.period}` },
        { label: "Usage", value: target.usageLine },
        { label: "Included", value: target.features.join(", ") },
      ],
      actions,
    },
    suggestions: ["Compare Flex and Unlimited.", "What is my current plan?"],
  };
}

function billingAnalysis(q: string, context: AiAdminContext): AiAdminAnalysisResult | null {
  if (q.includes("refund") || q.includes("환불") || q.includes("cancel subscription") || q.includes("구독 취소")) {
    return blocked("For billing changes like refunds, card changes, or cancellation, I can only open the official billing portal. I cannot approve or process those actions in chat.", [
      { label: "Allowed", value: "Plan lookup, usage lookup, plan comparison, checkout/portal links" },
      { label: "Not Allowed", value: "Card changes, refunds, forced plan changes, subscription cancellation" },
    ]);
  }

  if (q.includes("my plan") || q.includes("내 플랜") || q.includes("current plan")) {
    const locale = context.locale ?? runtimeUiLocale();
    return {
      kind: "billing",
      answer: composeAssistantReply({
        locale,
        facts: {
          headline:
            "Here is your plan information. Billing changes go through the official billing portal only.",
        },
      }),
      billingCard: {
        title: "Current Plan",
        description:
          "Plan lookup is read-only inside Effiroad AI.",
        rows: currentPlanRows(context.user, context.nextBillingDate),
        actions: [
          { label: "Compare Plans", href: "/pricing", kind: "compare" },
          { label: "Open Billing Portal", kind: "portal" },
        ],
      },
      suggestions: ["Compare Flex and Unlimited.", "Open billing portal."],
    };
  }

  if (q.includes("sms") && (q.includes("usage") || q.includes("얼마나") || q.includes("사용"))) {
    return blocked("SMS usage by message count is not tracked as a billing meter yet. I can show approved Flex usage from your account.", [
      { label: "Approved Flex Usage", value: String(mergeUserBilling(context.user).flexBillableCount ?? 0) },
    ]);
  }

  if (q.includes("compare") || q.includes("차이")) {
    return {
      kind: "billing",
      answer: "Effiroad currently has Flex and Unlimited plans.",
      billingCard: {
        title: "Plan Comparison",
        description: sitePricing.tip,
        rows: sitePricing.plans.map((plan) => ({
          label: plan.name,
          value: `${plan.price}${plan.period} · ${plan.usageLine}`,
        })),
        actions: [
          { label: "Open Pricing", href: "/pricing", kind: "compare" },
          { label: "Unlimited Checkout", href: "/api/checkout?plan=unlimited", kind: "checkout" },
        ],
      },
      suggestions: ["Upgrade to Unlimited.", "What is my current plan?"],
    };
  }

  if (q.includes("upgrade") || q.includes("업그레이드") || q.includes("pro") || q.includes("premium")) {
    return planCard("unlimited");
  }

  if (q.includes("flex plan") || q.includes("flex로")) {
    return planCard("flex");
  }

  if (q.includes("next bill") || q.includes("다음 결제")) {
    const locale = context.locale ?? runtimeUiLocale();
    if (context.nextBillingDate) {
      return {
        kind: "billing",
        answer: composeAssistantReply({
          locale,
          facts: {
            headline:
              `Your next billing date is ${context.nextBillingDate}.`,
          },
        }),
        billingCard: {
          title: "Next Billing",
          description:
            "Card changes and refunds are handled in the billing portal.",
          rows: currentPlanRows(context.user, context.nextBillingDate),
          actions: [{ label: "Open Billing Portal", kind: "portal" }],
        },
        suggestions: ["What is my current plan?"],
      };
    }
    return blocked(
      "I couldn't load the next billing date. Please check the official Paddle billing portal.",
      [{ label: "Portal", value: "Settings → Billing" }],
    );
  }

  return null;
}

function companyMemorySetCommand(query: string, q: string): AiAdminAnalysisResult | null {
  const fields: { field: CompanyMemoryField; keywords: string[]; title: string }[] = [
    { field: "businessHours", keywords: ["business hours", "영업시간", "운영시간"], title: "Business Hours" },
    { field: "holidayRules", keywords: ["holiday rules", "holiday", "휴일", "공휴일"], title: "Holiday Rules" },
    { field: "emergencyPolicy", keywords: ["emergency policy", "urgent policy", "긴급 요청", "긴급 정책"], title: "Emergency Policy" },
    { field: "approvalPolicy", keywords: ["approval policy", "승인 정책"], title: "Approval Policy" },
    { field: "specialInstructions", keywords: ["special instructions", "instructions", "특별 지시", "특이사항"], title: "Special Instructions" },
    { field: "customGreeting", keywords: ["greeting", "call greeting", "인사말", "안내 인사"], title: "Call Greeting" },
  ];

  for (const item of fields) {
    if (!item.keywords.some((keyword) => q.includes(keyword.toLowerCase()))) continue;
    const value = extractAfterKeyword(query, item.keywords);
    if (!value || value.length < 2) {
      return blocked(`${item.title}를 어떤 내용으로 변경할지 더 구체적으로 말해 주세요.`);
    }
    return preview(
      `Update ${item.title}`,
      `${item.title}을(를) "${value}"로 변경하시겠습니까?`,
      { type: "set_company_memory_field", field: item.field, value },
      [{ label: "New Value", value }],
    );
  }
  return null;
}

export function analyzeAiAdminIntent(
  query: string,
  context: AiAdminContext,
): AiAdminAnalysisResult {
  const q = normalize(query);
  const locale = context.locale ?? runtimeUiLocale();

  const billing = billingAnalysis(q, context);
  if (billing) return billing;

  if (q.includes("delete account") || q.includes("계정 삭제")) {
    return {
      kind: "preview",
      answer:
        "This permanently deletes your account and all shop data.",
      preview: {
        id: crypto.randomUUID(),
        title: "Delete Account",
        message:
          "Enter your password to confirm.",
        risk: "high",
        requiresPassword: true,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        action: { type: "delete_account" },
      },
      suggestions: [],
    };
  }

  if (q.includes("disconnect jobber") || q.includes("jobber 연결 해제")) {
    return {
      kind: "preview",
      answer:
        "This disconnects Jobber from Effiroad.",
      preview: {
        id: crypto.randomUUID(),
        title: "Disconnect Jobber",
        message:
          "Enter your password to confirm.",
        risk: "high",
        requiresPassword: true,
        confirmLabel: "Disconnect",
        cancelLabel: "Cancel",
        action: { type: "disconnect_jobber" },
      },
      suggestions: [],
    };
  }

  if (q.includes("change phone") || q.includes("전화번호 변경") || q.includes("번호 바꿔")) {
    const phone =
      query.match(/(\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|01[0-9][\s.-]?\d{3,4}[\s.-]?\d{4})/)?.[1] ??
      extractAfterKeyword(query, ["change phone", "전화번호", "phone to", "번호를"]);
    if (!phone) {
      return blocked(
        'Tell me the new phone number. Example: "Change phone to (512) 555-0100"',
      );
    }
    return {
      kind: "preview",
      answer:
        `Owner contact phone will change to ${phone}.`,
      preview: {
        id: crypto.randomUUID(),
        title: "Change Phone",
        message:
          "Enter your password to confirm.",
        risk: "high",
        requiresPassword: true,
        rows: [{ label: "New phone", value: phone }],
        confirmLabel: "Update",
        cancelLabel: "Cancel",
        action: { type: "update_owner_phone", phone },
      },
      suggestions: [],
    };
  }

  if (q.includes("always on") || q.includes("24시간 응답") || q.includes("항상 응답")) {
    const enable = !(q.includes("off") || q.includes("꺼") || q.includes("disable"));
    const title = enable
      ? "AI Always On"
      : "Disable AI Always On";
    const message = enable
      ? "AI will answer calls regardless of schedule windows."
      : "AI will stop answering outside your configured schedule.";
    return preview(title, message, { type: "set_ai_phone_answering", enabled: enable });
  }

  const wantsBriefing = q.includes("sms report") || q.includes("briefing") || q.includes("리포트") || q.includes("브리핑");
  if (wantsBriefing && (q.includes("off") || q.includes("disable") || q.includes("꺼"))) {
    return previewL(
      locale,
      "Disable Daily Briefing SMS",
      "Turn off the morning SMS report?",
      "아침 SMS 리포트를 비활성화하시겠습니까?",
      { type: "set_daily_briefing_sms", enabled: false },
    );
  }
  if (wantsBriefing && (q.includes("on") || q.includes("enable") || q.includes("켜"))) {
    return previewL(
      locale,
      "Enable Daily Briefing SMS",
      "Turn on the morning SMS report?",
      "아침 SMS 리포트를 활성화하시겠습니까?",
      { type: "set_daily_briefing_sms", enabled: true },
    );
  }
  if (wantsBriefing && (q.includes("time") || q.includes("change") || q.includes("변경") || q.includes("오전") || q.includes("오후"))) {
    const time = parseTime(query);
    if (!time) {
      return blocked(
        "Could not find a time. Try: 6:30 AM",
      );
    }
    return previewL(
      locale,
      "Change Daily Briefing Time",
      `Change the daily SMS report to ${formatTime(time)}?`,
      `매일 ${formatTime(time)}으로 변경하시겠습니까?`,
      { type: "set_daily_briefing_time", time },
      [{ label: "New Time", value: formatTime(time) }],
    );
  }

  if (q.includes("service area") || q.includes("서비스 지역")) {
    const area = extractArea(query);
    if (!area) {
      return blocked(
        "Tell me which city or area to add or remove.",
      );
    }
    if (q.includes("remove") || q.includes("delete") || q.includes("삭제") || q.includes("빼")) {
      return previewL(
        locale,
        "Remove Service Area",
        `Remove ${area} from your service areas?`,
        `${area}를 서비스 지역에서 삭제하시겠습니까?`,
        { type: "remove_service_area", area },
      );
    }
    if (q.includes("add") || q.includes("include") || q.includes("추가") || q.includes("넣어")) {
      return previewL(
        locale,
        "Add Service Area",
        `Add ${area} to your service areas?`,
        `${area}를 서비스 지역에 추가하시겠습니까?`,
        { type: "append_service_area", area },
      );
    }
  }

  const memoryCommand = companyMemorySetCommand(query, q);
  if (memoryCommand) return memoryCommand;

  if (q.includes("manual approval") || q.includes("수동 승인") || q.includes("every booking")) {
    return previewL(
      locale,
      "Text Me For Every Booking",
      "Get an approval text for every booking (not just urgent or unclear ones)?",
      "모든 예약마다 승인 문자를 받으시겠습니까?",
      { type: "set_owner_approval_sms", level: "all" },
    );
  }
  if (q.includes("auto book") || q.includes("빠른 예약") || q.includes("speed") || q.includes("hybrid")) {
    return previewL(
      locale,
      "Smart Auto-Book (Default)",
      "Use smart auto-book? Clear routine jobs confirm instantly; P1 and fuzzy intakes wait for your text.",
      "스마트 자동 예약을 사용하시겠습니까? 명확한 일반 건은 자동 확정, 긴급·불명확 건은 승인 문자를 받습니다.",
      { type: "set_owner_approval_sms", level: "p1_only" },
    );
  }

  if (q.includes("owner approval text") || q.includes("approval sms") || q.includes("승인 문자")) {
    if (q.includes("off") || q.includes("꺼")) {
      return previewL(
        locale,
        "Turn Off Approval SMS",
        "Turn off owner approval texts?",
        "업주 승인 SMS 알림을 끄시겠습니까?",
        { type: "set_owner_approval_sms", level: "off" },
      );
    }
    if (q.includes("all") || q.includes("전체")) {
      return previewL(
        locale,
        "Send All Approval SMS",
        "Text you for every booking that needs approval?",
        "모든 승인 대기 예약에 대해 업주 SMS를 보내시겠습니까?",
        { type: "set_owner_approval_sms", level: "all" },
      );
    }
    if (q.includes("p1") || q.includes("urgent") || q.includes("긴급")) {
      return previewL(
        locale,
        "Send P1 Approval SMS",
        "Text you only for P1 urgent approvals?",
        "P1 긴급 요청에만 업주 승인 SMS를 보내시겠습니까?",
        { type: "set_owner_approval_sms", level: "p1_only" },
      );
    }
  }

  if (q.includes("ai phone") || q.includes("전화 응답") || q.includes("ai 응답")) {
    if (q.includes("off") || q.includes("disable") || q.includes("꺼")) {
      return preview("Disable AI Phone Answering", "AI 전화 응답 설정을 비활성화하시겠습니까?", {
        type: "set_ai_phone_answering",
        enabled: false,
      });
    }
    if (q.includes("on") || q.includes("enable") || q.includes("켜")) {
      return preview("Enable AI Phone Answering", "AI 전화 응답 설정을 활성화하시겠습니까?", {
        type: "set_ai_phone_answering",
        enabled: true,
      });
    }
  }

  if (q.includes("plan") || q.includes("billing") || q.includes("결제") || q.includes("플랜")) {
    return billingAnalysis("my plan", context) ?? { kind: "none" };
  }

  void context.companyMemory;
  void context.bookingSettings;
  void context.shopProfile;
  return { kind: "none" };
}

export function shouldRunAdminAnalyzer(query: string): boolean {
  const q = normalize(query);
  if (isAdminMutationQuery(query)) return true;
  if (isWorkflowMutationQuery(query)) return true;
  return (
    q.includes("plan") ||
    q.includes("billing") ||
    q.includes("flex") ||
    q.includes("upgrade") ||
    q.includes("결제") ||
    q.includes("플랜") ||
    q.includes("구독") ||
    q.includes("refund") ||
    q.includes("환불") ||
    mightBeClosureRelated(query)
  );
}
