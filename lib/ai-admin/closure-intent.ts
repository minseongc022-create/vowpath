import type { UiLocale } from "../locale";
import type { AiAdminAnalysisResult } from "./types";

const CLASSIFICATION_PROMPT = `You are an intent classifier for a home services business AI assistant (restoration, HVAC, plumbing, etc.).

Determine if the user's message expresses ONE of these intents about TODAY's operations:

1. "day_off" — The user wants to set today as fully closed / a day off. The AI phone should play a closed message to every caller.
   Examples: "오늘 휴무야", "오늘 영업 안 해", "I'm not taking calls today", "closed today", "금일 운영 중단", "오늘 쉬어", "오늘 쉴게", "문 닫아", "not working today", "taking the day off"

2. "custom_message_today" — The user wants to play a specific custom message to callers today only (they explicitly provide the message text).
   Examples: "오늘만 '오후 3시 이후 운영 안 해요' 전달해줘", "tell callers today only: we're at a job site until 5pm"

3. "early_close" — The user wants to close early today at a specific time.
   Examples: "오늘 오후 3시에 마감해", "오늘 3시에 마감할게", "close early today at 2pm", "closing at 3 today", "일찍 마감해 오늘 오후 2시"

4. "clear_closure" — The user wants to cancel/clear a previously set temporary closure and resume normal answering.
   Examples: "휴무 해제", "다시 영업해", "다시 전화 받아", "clear closure", "reopen today", "영업 다시 해"

5. "none" — Not related to today's temporary closure or operation hours.

Respond ONLY with valid JSON. No explanation, no markdown.

For "day_off": {"intent":"day_off","customMessage":""}
For "custom_message_today": {"intent":"custom_message_today","message":"<extracted verbatim message text only, no surrounding quotes>"}
For "early_close": {"intent":"early_close","closeTime":"HH:MM"} (24-hour format)
For "clear_closure": {"intent":"clear_closure"}
For "none": {"intent":"none"}

If the intent is ambiguous or the message is about past/future days (not today), respond with {"intent":"none"}.`;

type ClosureClassification =
  | { intent: "day_off"; customMessage: string }
  | { intent: "custom_message_today"; message: string }
  | { intent: "early_close"; closeTime: string }
  | { intent: "clear_closure" }
  | { intent: "none" };

/** Broad pre-filter — avoids calling GPT for clearly unrelated queries. */
export function mightBeClosureRelated(query: string): boolean {
  const q = query.toLowerCase();
  return (
    q.includes("오늘") ||
    q.includes("today") ||
    q.includes("금일") ||
    q.includes("휴무") ||
    q.includes("마감") ||
    q.includes("closed") ||
    q.includes("영업") ||
    q.includes("쉬어") ||
    q.includes("쉴게") ||
    q.includes("reopen") ||
    q.includes("안 받아") ||
    q.includes("문 닫") ||
    q.includes("close early") ||
    q.includes("taking calls") ||
    q.includes("day off") ||
    q.includes("not working")
  );
}

function formatDisplayTime(closeTime: string): string {
  const [hStr, mStr] = closeTime.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (!Number.isFinite(h)) return closeTime;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${suffix}`;
}

function buildResult(data: ClosureClassification, locale: UiLocale): AiAdminAnalysisResult | null {
  if (data.intent === "none") return null;

  const today = new Date().toISOString().split("T")[0];
  const ko = locale === "ko";

  if (data.intent === "day_off") {
    const msg = data.customMessage?.trim() ?? "";
    return {
      kind: "preview",
      answer: ko
        ? `오늘(${today})을 휴무일로 설정합니다. 전화를 건 고객에게 휴무 안내 메시지가 재생됩니다.`
        : `Set today (${today}) as a closure day? Callers will hear a closed message instead of intake.`,
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "오늘 휴무 설정" : "Set Today as Closed",
        message: ko
          ? `오늘(${today})을 휴무일로 설정합니다.`
          : `Today (${today}) will be set as a closure day.`,
        risk: "medium",
        confirmLabel: ko ? "설정" : "Confirm",
        cancelLabel: ko ? "취소" : "Cancel",
        rows: [
          { label: ko ? "날짜" : "Date", value: today },
          ...(msg ? [{ label: ko ? "커스텀 메시지" : "Message", value: msg }] : []),
        ],
        action: { type: "set_temporary_closure", date: today, message: msg },
      },
      suggestions: ko
        ? ["오늘 휴무 해제", "오늘 오후 3시에 마감해"]
        : ["Clear today's closure", "Close early at 3 PM today"],
    };
  }

  if (data.intent === "custom_message_today") {
    const msg = data.message?.trim() ?? "";
    if (!msg) return null;
    return {
      kind: "preview",
      answer: ko
        ? `오늘(${today}) 전화 발신자에게 이 메시지를 재생합니다: "${msg}"`
        : `Play this message to callers today (${today}): "${msg}"`,
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "오늘 임시 안내 메시지" : "Today-Only Custom Message",
        message: ko ? `오늘 발신자에게 재생: "${msg}"` : `Play to callers today: "${msg}"`,
        risk: "medium",
        confirmLabel: ko ? "설정" : "Confirm",
        cancelLabel: ko ? "취소" : "Cancel",
        rows: [
          { label: ko ? "날짜" : "Date", value: today },
          { label: ko ? "메시지" : "Message", value: msg },
        ],
        action: { type: "set_temporary_closure", date: today, message: msg },
      },
      suggestions: [],
    };
  }

  if (data.intent === "early_close") {
    const closeTime = data.closeTime?.trim() ?? "";
    if (!/^\d{2}:\d{2}$/.test(closeTime)) return null;
    const displayTime = formatDisplayTime(closeTime);
    const callerMsg = ko
      ? `오늘은 ${displayTime}에 마감합니다. 이후에는 다음 날 연락 주세요.`
      : `We are closing early today at ${displayTime}. Please call back tomorrow for assistance.`;
    return {
      kind: "preview",
      answer: ko
        ? `오늘(${today}) ${displayTime}부로 조기 마감 설정합니다.`
        : `Set today (${today}) to close early at ${displayTime}?`,
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "오늘 조기 마감 설정" : "Set Early Close Today",
        message: ko
          ? `오늘 ${displayTime}부터 발신자에게 마감 안내를 재생합니다.`
          : `Callers after ${displayTime} will hear a closed message.`,
        risk: "medium",
        confirmLabel: ko ? "설정" : "Confirm",
        cancelLabel: ko ? "취소" : "Cancel",
        rows: [
          { label: ko ? "마감 시간" : "Close Time", value: displayTime },
          { label: ko ? "안내 메시지" : "Caller Message", value: callerMsg },
        ],
        action: { type: "set_temporary_closure", date: today, message: callerMsg },
      },
      suggestions: [],
    };
  }

  if (data.intent === "clear_closure") {
    return {
      kind: "preview",
      answer: ko
        ? "오늘 임시 휴무를 해제하고 정상 전화 응답으로 돌아갑니다."
        : "Resume normal phone answering today?",
      preview: {
        id: crypto.randomUUID(),
        title: ko ? "임시 휴무 해제" : "Clear Temporary Closure",
        message: ko
          ? "임시 휴무 해제 후 정상 전화 응답이 재개됩니다."
          : "Normal phone answering will resume immediately.",
        risk: "low",
        confirmLabel: ko ? "해제" : "Clear",
        cancelLabel: ko ? "취소" : "Cancel",
        action: { type: "clear_temporary_closure" },
      },
      suggestions: [],
    };
  }

  return null;
}

/**
 * GPT-4o-mini based closure intent classifier.
 * Pre-filters with keywords before calling the API to avoid unnecessary cost.
 * Returns null if the query is not closure-related.
 */
export async function analyzeClosureIntentAsync(
  query: string,
  locale: UiLocale,
): Promise<AiAdminAnalysisResult | null> {
  if (!mightBeClosureRelated(query)) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 80,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CLASSIFICATION_PROMPT },
          { role: "user", content: query },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const data = JSON.parse(content) as ClosureClassification;
    return buildResult(data, locale);
  } catch {
    return null;
  }
}
