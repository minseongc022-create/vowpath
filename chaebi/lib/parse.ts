import { openAiJsonCompletion } from "@/lib/openai-json";
import type {
  MissingField,
  NeedKind,
  OccasionKind,
  RelationKind,
  SituationBrief,
  TimeOfDay,
} from "./types";
import { buildHeadline, parseWithRules } from "./parse-rules";
import { addDays, daysBetween, minutesToTime, seoulDateISO, seoulTime, timeToMinutes } from "./datetime";
import { REGIONS, detectRegion, regionLabel } from "./regions";

/**
 * 상황 파싱 = 규칙 파서(항상) + LLM 덧칠(있으면).
 *
 * 순서가 중요하다. 규칙 파서가 먼저 완전한 결과를 만들고, LLM 응답은 필드
 * 단위로 검증해서 통과한 것만 덮어쓴다. LLM이 없거나 실패해도 사용자는
 * 차이를 못 느낀다 — 다만 뉘앙스("조용한 데로", "매운 거 못 먹어")를 잡는
 * 정확도가 떨어질 뿐이다.
 */

const OCCASIONS: OccasionKind[] = [
  "birthday", "anniversary", "proposal", "parents_day", "date",
  "apology", "congratulation", "farewell", "other",
];
const RELATIONS: RelationKind[] = [
  "girlfriend", "boyfriend", "spouse", "parent", "friend", "colleague", "child", "self", "unknown",
];
const NEEDS: NeedKind[] = ["restaurant", "cake", "gift", "flower", "activity", "photo", "transport"];
const TIMES: TimeOfDay[] = ["morning", "lunch", "afternoon", "evening", "night"];

/** 사용자가 확인 화면에서 직접 고쳐 넣는 값들 */
export type BriefOverrides = {
  dateISO?: string;
  startTime?: string;
  regionKey?: string;
  budgetKrw?: number;
  headcount?: number;
  needs?: NeedKind[];
};

type AiBrief = {
  occasion?: string;
  relation?: string;
  recipient_label?: string | null;
  date?: string;
  start_time?: string;
  time_of_day?: string;
  region?: string;
  budget_krw?: number | null;
  headcount?: number;
  vibes?: string[];
  needs?: string[];
  constraints?: string[];
  notes?: string;
  confidence?: number;
};

function systemPrompt(todayISO: string, nowTime: string): string {
  const regionList = REGIONS.filter((r) => r.offline).map((r) => `${r.key}(${r.label})`).join(", ");
  return [
    "너는 한국어 상황 한 줄을 구조화하는 파서다. 설명하지 말고 JSON만 낸다.",
    `오늘은 ${todayISO}, 지금 시각은 ${nowTime} (Asia/Seoul).`,
    "",
    "필드:",
    `- occasion: ${OCCASIONS.join(" | ")}`,
    `- relation: ${RELATIONS.join(" | ")}`,
    "- recipient_label: 사용자가 쓴 호칭 그대로 (예: \"여친\", \"어머니\"). 없으면 null.",
    "- date: YYYY-MM-DD. \"내일\"·\"이번주 토요일\" 같은 말을 오늘 기준으로 반드시 실제 날짜로 환산한다.",
    "- start_time: HH:mm 24시간제. 자리가 시작되는 시각.",
    `- time_of_day: ${TIMES.join(" | ")}`,
    `- region: 다음 중 하나의 key. ${regionList}. 판단 못 하면 null.`,
    "- budget_krw: 사용자가 예산을 말한 경우에만 숫자(원). 안 말했으면 null. 절대 추측하지 마라.",
    "- headcount: 참석 인원 수(정수).",
    "- vibes: 원하는 분위기 키워드 배열. 조용한/분위기/야경/프라이빗/캐주얼/고급/감성/활기찬/주차 중에서만 고른다.",
    `- needs: 준비해야 할 것 배열. ${NEEDS.join(" | ")} 중에서만 고른다. 사용자가 \"이미 했다\"고 한 항목은 빼라.`,
    "- constraints: 반드시 지켜야 할 제약(알레르기·채식·주차·거동 불편 등)을 한국어 짧은 구로.",
    "- notes: 추천에 반영할 만한 개인적 맥락 한 문장. 없으면 빈 문자열.",
    "- confidence: 0~1. 입력이 짧고 모호하면 낮게.",
    "",
    "규칙: 사용자가 말하지 않은 것을 지어내지 마라. 모르면 null.",
  ].join("\n");
}

function pick<T extends string>(value: unknown, allowed: T[]): T | null {
  return typeof value === "string" && (allowed as string[]).includes(value) ? (value as T) : null;
}

function validDate(value: unknown, todayISO: string): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const diff = daysBetween(todayISO, value);
  // 과거이거나 1년을 넘기면 환산을 잘못한 것으로 본다
  return diff >= 0 && diff <= 365 ? value : null;
}

function validTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function validBudget(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 5_000 || value > 100_000_000) return null;
  return Math.round(value);
}

function validStrings(value: unknown, max = 6): string[] | null {
  if (!Array.isArray(value)) return null;
  const clean = value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= 40)
    .map((v) => v.trim())
    .slice(0, max);
  return clean.length ? clean : null;
}

function validNeeds(value: unknown): NeedKind[] | null {
  if (!Array.isArray(value)) return null;
  const clean = value.filter((v): v is NeedKind => typeof v === "string" && (NEEDS as string[]).includes(v));
  return clean.length ? [...new Set(clean)] : null;
}

function recomputeMissing(brief: SituationBrief, aiSaidRegion: boolean, aiSaidDate: boolean): MissingField[] {
  const missing: MissingField[] = [];
  if (!aiSaidDate) missing.push("date");
  if (!aiSaidRegion) missing.push("region");
  if (!brief.budgetStated) missing.push("budget");
  return missing;
}

/** LLM 결과를 규칙 결과 위에 필드 단위로 덮는다. 통과 못 한 필드는 그대로 둔다. */
function mergeAi(base: SituationBrief, ai: AiBrief, todayISO: string): SituationBrief {
  const merged: SituationBrief = { ...base, source: "ai" };

  const occasion = pick(ai.occasion, OCCASIONS);
  if (occasion) merged.occasion = occasion;

  const relation = pick(ai.relation, RELATIONS);
  if (relation) merged.relation = relation;

  if (typeof ai.recipient_label === "string" && ai.recipient_label.trim() && ai.recipient_label.length <= 20) {
    merged.recipientLabel = ai.recipient_label.trim();
  }

  const date = validDate(ai.date, todayISO);
  if (date) merged.dateISO = date;

  const startTime = validTime(ai.start_time);
  if (startTime) merged.startTime = startTime;

  const timeOfDay = pick(ai.time_of_day, TIMES);
  if (timeOfDay) merged.timeOfDay = timeOfDay;

  // region은 key로 주는 게 원칙이지만, 지역명을 그대로 뱉는 경우가 있어 한 번 더 훑는다
  if (typeof ai.region === "string" && ai.region) {
    const byKey = REGIONS.find((r) => r.key === ai.region);
    const byName = byKey ? null : detectRegion(ai.region);
    const resolved = byKey ?? byName;
    if (resolved && resolved.offline) {
      merged.regionKey = resolved.key;
      merged.regionLabel = resolved.label;
    }
  }

  const budget = validBudget(ai.budget_krw);
  if (budget) {
    merged.budgetKrw = budget;
    merged.budgetStated = true;
  }

  if (typeof ai.headcount === "number" && ai.headcount >= 1 && ai.headcount <= 40) {
    merged.headcount = Math.round(ai.headcount);
  }

  const vibes = validStrings(ai.vibes);
  if (vibes) merged.vibes = [...new Set([...base.vibes, ...vibes])].slice(0, 6);

  const needs = validNeeds(ai.needs);
  if (needs) merged.needs = needs;

  const constraints = validStrings(ai.constraints, 4);
  if (constraints) merged.constraints = [...new Set([...base.constraints, ...constraints])].slice(0, 4);

  if (typeof ai.notes === "string" && ai.notes.trim().length <= 200) merged.notes = ai.notes.trim();

  if (typeof ai.confidence === "number" && ai.confidence >= 0 && ai.confidence <= 1) {
    // 규칙 파서가 확실히 잡은 건 LLM이 낮춰도 그대로 둔다
    merged.confidence = Math.max(base.confidence, Math.min(0.97, ai.confidence));
  }

  merged.missing = recomputeMissing(merged, Boolean(ai.region), Boolean(date));
  merged.regionLabel = regionLabel(merged.regionKey);
  return merged;
}

/** 확인 화면에서 사용자가 직접 고친 값 — 무조건 이긴다. */
export function applyOverrides(brief: SituationBrief, overrides: BriefOverrides, now: Date = new Date()): SituationBrief {
  const todayISO = seoulDateISO(now);
  const next: SituationBrief = { ...brief };

  if (overrides.dateISO && validDate(overrides.dateISO, todayISO)) {
    next.dateISO = overrides.dateISO;
    const diff = daysBetween(todayISO, next.dateISO);
    next.urgency = diff <= 0 ? "today" : diff === 1 ? "tomorrow" : diff <= 7 ? "this_week" : "later";
  }
  const time = overrides.startTime ? validTime(overrides.startTime) : null;
  if (time) next.startTime = time;

  if (overrides.regionKey) {
    const region = REGIONS.find((r) => r.key === overrides.regionKey);
    if (region) {
      next.regionKey = region.key;
      next.regionLabel = region.label;
    }
  }
  const budget = overrides.budgetKrw != null ? validBudget(overrides.budgetKrw) : null;
  if (budget) {
    next.budgetKrw = budget;
    next.budgetStated = true;
  }
  if (overrides.headcount && overrides.headcount >= 1 && overrides.headcount <= 40) {
    next.headcount = Math.round(overrides.headcount);
  }
  const needs = overrides.needs ? validNeeds(overrides.needs) : null;
  if (needs) next.needs = needs;

  next.missing = next.missing.filter((field) => {
    if (field === "date" && overrides.dateISO) return false;
    if (field === "region" && overrides.regionKey) return false;
    if (field === "budget" && overrides.budgetKrw) return false;
    return true;
  });
  return next;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * 상황 한 줄 → SituationBrief.
 * LLM 실패는 조용히 삼킨다 — 규칙 결과로도 앱은 온전히 돈다.
 */
export async function parseSituation(
  rawText: string,
  options: { now?: Date; overrides?: BriefOverrides } = {},
): Promise<SituationBrief> {
  const now = options.now ?? new Date();
  const base = parseWithRules(rawText, now);

  let brief = base;
  if (isAiConfigured() && rawText.trim().length >= 4) {
    const todayISO = seoulDateISO(now);
    try {
      const ai = await openAiJsonCompletion<AiBrief>({
        system: systemPrompt(todayISO, seoulTime(now)),
        user: rawText.trim().slice(0, 1200),
        temperature: 0,
        timeoutMs: 12_000,
        model: process.env.CHAEBI_OPENAI_MODEL,
      });
      brief = mergeAi(base, ai, todayISO);
    } catch {
      // 키 없음·타임아웃·429 — 규칙 결과로 계속 간다
      brief = base;
    }
  }

  if (options.overrides) brief = applyOverrides(brief, options.overrides, now);
  brief = pushPastStartTime(brief, now);
  brief.headline = buildHeadline(brief, seoulDateISO(now));
  return brief;
}

/**
 * "오늘 저녁 7시"라고 했는데 지금이 이미 저녁 8시면 그대로 잡을 수 없다.
 * 최소 1시간의 준비 시간을 확보하고, 그것도 안 되면 다음 날로 민다.
 */
function pushPastStartTime(brief: SituationBrief, now: Date): SituationBrief {
  const todayISO = seoulDateISO(now);
  if (brief.dateISO !== todayISO) return brief;

  const nowMinutes = timeToMinutes(seoulTime(now));
  const startMinutes = timeToMinutes(brief.startTime);
  if (startMinutes >= nowMinutes + 60) return brief;

  const LAST_SEATING = timeToMinutes("22:00");
  const earliest = Math.ceil((nowMinutes + 90) / 30) * 30; // 30분 단위로 올림
  if (earliest > LAST_SEATING) {
    return {
      ...brief,
      dateISO: addDays(todayISO, 1),
      urgency: "tomorrow",
      startTime: "19:00",
      timeOfDay: "evening",
    };
  }
  return { ...brief, startTime: minutesToTime(earliest) };
}
