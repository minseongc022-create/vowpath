import { isEnglishUi } from "./locale";

/**
 * Dashboard-facing labels for intake data.
 * English UI: pass through. Korean UI: localize phrases and HVAC terms.
 */

const ISSUE_EXACT: Record<string, string> = {
  "no cool": "냉방 불량",
  "no cooling": "냉방 불량",
  "no heat": "난방 불량",
  "no heating": "난방 불량",
  leak: "누수",
  maintenance: "정기 점검",
  "service request": "서비스 요청",
  "inbound call": "인바운드 콜",
  "unknown": "미상",
};

const ISSUE_CONTAINS: [RegExp, string][] = [
  [/no\s*cool/i, "냉방 불량"],
  [/no\s*cooling/i, "냉방 불량"],
  [/no\s*heat/i, "난방 불량"],
  [/not\s*cooling/i, "냉방 불량"],
  [/ac\s*(not|won'?t|isn't)\s*work/i, "에어컨 고장"],
  [/air\s*condition/i, "에어컨"],
  [/furnace/i, "난방 설비"],
  [/thermostat/i, "온도조절기"],
  [/leak/i, "누수"],
  [/water\s*heater/i, "온수기"],
  [/maintenance/i, "정기 점검"],
];

const ARRIVAL_PHRASES: [RegExp, string][] = [
  [/pending\s*shop\s*review/i, "샵 검토 대기"],
  [/tbd/i, "미정"],
  [/need\s+someone\s+tonight/i, "오늘 밤 방문 희망"],
  [/tonight/i, "오늘 밤"],
  [/asap|as\s+soon\s+as\s+possible/i, "가능한 한 빨리"],
  [/this\s+afternoon/i, "오늘 오후"],
  [/tomorrow\s+morning/i, "내일 아침"],
  [/tomorrow/i, "내일"],
  [/same\s*day/i, "당일"],
  [/morning/i, "오전"],
  [/afternoon/i, "오후"],
  [/evening/i, "저녁"],
];

const REASON_PHRASES: [RegExp, string][] = [
  [/emergency/i, "긴급"],
  [/no\s*cool/i, "냉방 불량"],
  [/extreme\s*heat|105\s*°?\s*f/i, "폭염"],
  [/indoor\s*(very\s*)?hot/i, "실내 고온"],
  [/completely\s*stopped|not\s*working/i, "완전 정지"],
  [/same\s*day/i, "당일"],
  [/shop\s*review/i, "샵 검토"],
  [/dispatch/i, "출동"],
  [/caller\s*preference/i, "고객 희망"],
  [/pending\s*review/i, "검토 대기"],
  [/ai\s*classified/i, "AI 분류"],
  [/keyword/i, "키워드"],
  [/transcript/i, "통화 전사"],
  [/manual\s*override/i, "수동 변경"],
];

const SUMMARY_PHRASES: [RegExp, string][] = [
  [/customer\s+reports/i, "고객 신고:"],
  [/located\s+in/i, "위치:"],
  [/caller\s+preference/i, "고객 희망:"],
  [/emergency\s*—/i, "긴급 —"],
  [/shop\s+review\s+required/i, "출동 전 샵 검토 필요"],
  [/not\s+confirmed\s+until\s+approved/i, "승인 전까지 예약 확정 아님"],
  [/same-day\s+preference/i, "당일 희망"],
  [/service\s+request\s+captured/i, "서비스 요청 접수됨"],
  [/approve\s+or\s+reject/i, "승인 또는 거절"],
];

const CUSTOMER_FALLBACK: Record<string, string> = {
  "unknown customer": "고객명 미상",
  unknown: "미상",
  customer: "고객",
};

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function applyPhraseMap(text: string, rules: [RegExp, string][]): string {
  let out = text;
  for (const [re, ko] of rules) {
    out = out.replace(re, ko);
  }
  return out;
}

export function localizeIssueType(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw || "—";
  if (!raw || raw === "—") return "—";

  const key = normalizeKey(raw);
  if (ISSUE_EXACT[key]) return ISSUE_EXACT[key];

  for (const [re, ko] of ISSUE_CONTAINS) {
    if (re.test(raw)) return ko;
  }

  return raw;
}

export function localizeCustomerName(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw || "Unknown customer";
  if (!raw) return "고객명 미상";
  const key = normalizeKey(raw);
  return CUSTOMER_FALLBACK[key] ?? raw;
}

export function localizeCityState(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw || "—";
  if (!raw || raw === "—") return "—";
  if (/^unknown$/i.test(raw)) return "미상";
  return raw.replace(/\bUnknown\b/gi, "미상");
}

export function localizeAddress(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw || "—";
  if (!raw || raw === "—") return "—";
  if (/^unknown$/i.test(raw)) return "미상";

  let out = raw
    .replace(/\bMain Street\b/gi, "메인 스트리트")
    .replace(/\bStreet\b/gi, "거리")
    .replace(/\bAvenue\b/gi, "대로")
    .replace(/\bDrive\b/gi, "드라이브")
    .replace(/\bTexas\b/gi, "텍사스")
    .replace(/\bAustin\b/gi, "오스틴");

  const spelledNumbers = /^one two three/i;
  if (spelledNumbers.test(out)) {
    out = out.replace(/^one two three/i, "123");
  }

  return out;
}

export function localizeArrivalWindow(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw;
  if (!raw) return raw;
  return applyPhraseMap(raw, ARRIVAL_PHRASES);
}

export function localizePriorityReason(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw;
  if (!raw) return raw;
  return applyPhraseMap(raw, REASON_PHRASES);
}

export function localizeCallSummary(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw;
  if (!raw) return raw;
  let out = applyPhraseMap(raw, SUMMARY_PHRASES);
  out = applyPhraseMap(out, REASON_PHRASES);
  return out;
}

const TRANSCRIPT_PHRASES: [RegExp, string][] = [
  [/^hi,?\s*/i, ""],
  [/no\s*cool/gi, "냉방 불량"],
  [/need\s+someone\s+tonight/gi, "오늘 밤 방문 희망"],
  [/indoor\s+eighty[- ]?six\s+degrees/gi, "실내 86°F"],
  [/two\s+kids\s+at\s+home/gi, "자녀 2명 재실"],
  [/one two three/gi, "123"],
  [/main\s+street/gi, "메인 스트리트"],
  [/austin\s+texas/gi, "오스틴, 텍사스"],
];

export function localizeTranscript(value: string): string {
  const raw = value?.trim() ?? "";
  if (isEnglishUi()) return raw;
  if (!raw) return raw;
  return applyPhraseMap(raw, TRANSCRIPT_PHRASES);
}

export type LocalizedBookingFields = {
  customerName: string;
  issueType: string;
  address: string;
  cityState: string;
  arrivalWindow?: string;
  callSummary: string;
  priorityReasons: string[];
};

export function localizeBookingFields(input: {
  customerName: string;
  issueType: string;
  address: string;
  cityState: string;
  arrivalWindow?: string;
  callSummary: string;
  priorityReasons: string[];
}): LocalizedBookingFields {
  return {
    customerName: localizeCustomerName(input.customerName),
    issueType: localizeIssueType(input.issueType),
    address: localizeAddress(input.address),
    cityState: localizeCityState(input.cityState),
    arrivalWindow: input.arrivalWindow
      ? localizeArrivalWindow(input.arrivalWindow)
      : undefined,
    callSummary: localizeCallSummary(input.callSummary),
    priorityReasons: (input.priorityReasons ?? []).map(localizePriorityReason),
  };
}
