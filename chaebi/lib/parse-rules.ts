import type {
  MissingField,
  NeedKind,
  OccasionKind,
  RelationKind,
  SituationBrief,
  TimeOfDay,
  Urgency,
} from "./types";
import { addDays, dayOfWeek, daysBetween, seoulDateISO, seoulTime, timeToMinutes } from "./datetime";
import { detectRegion } from "./regions";

/**
 * 규칙 기반 상황 파서.
 *
 * ★ 왜 LLM만 쓰지 않는가
 *
 * 이 앱의 첫 화면은 입력 한 줄이 전부다. 그 한 줄이 안 풀리면 앱이 아무것도
 * 못 한다. 그런데 LLM 호출은 키가 없을 수도, 느릴 수도, 429가 날 수도 있다.
 * 그래서 규칙 파서가 **항상 먼저** 돌아 완전한 SituationBrief를 만들고,
 * LLM은 그 위에 덧칠만 한다(parse.ts). LLM이 죽어도 앱은 산다.
 *
 * 규칙 파서는 한국어 입력의 실제 모양을 따라간다 — "내일 여친 생일인데
 * 아무것도 못했어", "이번주 토요일 부모님 생신 30만원 정도로".
 */

type Match<T> = { value: T; matched: boolean };

const OCCASION_RULES: [OccasionKind, RegExp][] = [
  ["proposal", /프로포즈|프러포즈|청혼|프로포즈할/],
  ["parents_day", /어버이날|어머니날|아버지날|스승의날/],
  ["anniversary", /기념일|주년|백일|100일|１００일|결혼기념/],
  ["birthday", /생일|생신|birthday|비데이/i],
  ["apology", /미안|사과|화났|삐졌|싸웠|화해/],
  ["congratulation", /합격|승진|취업|졸업|개업|출산|입학|축하할/],
  ["farewell", /송별|퇴사|이직|전역|배웅|마지막날/],
  ["date", /데이트|놀러|만나기로|보러가|나들이/],
];

const RELATION_RULES: [RelationKind, RegExp][] = [
  ["girlfriend", /여자친구|여친|여자 친구|그녀|애인(?!과)/],
  ["boyfriend", /남자친구|남친|남자 친구/],
  ["spouse", /아내|와이프|남편|신랑|각시|배우자|결혼기념/],
  ["parent", /부모님|어머니|엄마|아버지|아빠|장인|장모|시어머니|시아버지|어른들|생신/],
  ["child", /아들|딸|아이|우리 애|애기|자녀/],
  ["colleague", /동료|팀장|상사|부장|과장|직장|회사 사람|후배|선배/],
  ["friend", /친구|베프|절친/],
];

/** 호칭을 원문 그대로 되돌려주기 위한 표기 */
const RELATION_LABEL: Record<RelationKind, string> = {
  girlfriend: "여자친구",
  boyfriend: "남자친구",
  spouse: "배우자",
  parent: "부모님",
  child: "아이",
  friend: "친구",
  colleague: "동료",
  self: "나",
  unknown: "",
};

const WEEKDAY_TOKENS: [number, RegExp][] = [
  [0, /일요일|일욜/],
  [1, /월요일|월욜/],
  [2, /화요일|화욜/],
  [3, /수요일|수욜/],
  [4, /목요일|목욜/],
  [5, /금요일|금욜/],
  [6, /토요일|토욜/],
];

const TIME_OF_DAY_RULES: [TimeOfDay, RegExp, string][] = [
  ["morning", /아침|오전|조식|모닝/, "09:30"],
  ["lunch", /점심|런치|낮 ?12|정오/, "12:30"],
  ["afternoon", /오후|낮에|티타임|브런치/, "15:00"],
  ["night", /밤에|늦게|야식|심야|자정|늦은 ?시간/, "21:00"],
  ["evening", /저녁|디너|저물|해질/, "19:00"],
];

const VIBE_RULES: [string, RegExp][] = [
  ["조용한", /조용|시끄럽지|차분|한적/],
  ["분위기", /분위기|무드|로맨틱|근사한|예쁜/],
  ["야경", /야경|뷰|전망|노을|일몰/],
  ["프라이빗", /프라이빗|둘만|단둘|룸|개인실|조용히/],
  ["캐주얼", /편한|가볍게|부담없|캐주얼|간단히/],
  ["고급", /고급|파인다이닝|제대로|비싼|호텔|특별하게/],
  ["감성", /감성|아기자기|아늑|힙한|사진/],
  ["활기찬", /신나게|왁자|재밌게|시끌/],
  ["주차", /주차|차 ?가지고|운전/],
];

const CONSTRAINT_RULES: [string, RegExp][] = [
  ["채식 가능한 곳", /비건|채식|고기 ?못|고기 ?안/],
  ["알레르기 확인 필요", /알레르기|알러지|땅콩|갑각류/],
  ["주차 가능한 곳", /주차|차 ?가지고|운전해서/],
  ["매운 음식 제외", /매운 ?거 ?못|맵찔|안 ?매운/],
  ["휠체어·거동 배려", /휠체어|다리가 ?불편|거동/],
  ["아이 동반", /아이 ?데리고|애기 ?데리고|유아|아기 ?의자/],
  ["술 없는 자리", /술 ?안|금주|술 ?못/],
];

const NEED_MENTION: [NeedKind, RegExp][] = [
  ["restaurant", /식당|맛집|저녁|점심|밥|예약|레스토랑|외식|한 ?끼/],
  ["cake", /케이크|케잌|케익/],
  ["gift", /선물|기프트|사줄|줄 ?거|뭐 ?사/],
  ["flower", /꽃|플라워|부케|장미/],
  ["activity", /데이트 ?코스|놀 ?거리|체험|클래스|공방|코스|뭐하지|어디 ?갈/],
  ["photo", /사진|스냅|촬영|포토/],
  ["transport", /택시|차편|데리러|모시고|픽업 ?차/],
];

/** "케이크는 이미 샀어" 같은 말은 그 항목을 빼야 한다. */
const NEED_ALREADY: [NeedKind, RegExp][] = [
  ["restaurant", /(식당|예약|자리)[은는이가]? ?(이미 |벌써 )?(했|잡았|잡아|되어|돼|끝)/],
  ["cake", /케이[크익크][은는이가]? ?(이미 |벌써 )?(샀|있|준비|주문)/],
  ["gift", /선물[은는이가]? ?(이미 |벌써 )?(샀|있|준비|골랐)/],
  ["flower", /꽃[은는이가]? ?(이미 |벌써 )?(샀|있|준비|주문)/],
];

const NEEDS_BY_OCCASION: Record<OccasionKind, NeedKind[]> = {
  birthday: ["restaurant", "cake", "gift"],
  anniversary: ["restaurant", "gift", "flower"],
  proposal: ["restaurant", "flower", "gift", "photo"],
  parents_day: ["restaurant", "gift", "flower"],
  date: ["restaurant", "activity"],
  apology: ["flower", "gift", "restaurant"],
  congratulation: ["restaurant", "gift", "flower"],
  farewell: ["restaurant", "gift"],
  other: ["restaurant", "gift"],
};

const BASE_BUDGET: Record<OccasionKind, number> = {
  birthday: 220_000,
  anniversary: 280_000,
  proposal: 700_000,
  parents_day: 260_000,
  date: 150_000,
  apology: 160_000,
  congratulation: 140_000,
  farewell: 110_000,
  other: 160_000,
};

function detectOccasion(text: string): Match<OccasionKind> {
  for (const [kind, re] of OCCASION_RULES) {
    if (re.test(text)) return { value: kind, matched: true };
  }
  return { value: "other", matched: false };
}

function detectRelation(text: string): Match<RelationKind> {
  for (const [kind, re] of RELATION_RULES) {
    if (re.test(text)) return { value: kind, matched: true };
  }
  return { value: "unknown", matched: false };
}

/** 원문에 쓰인 호칭을 그대로 뽑아 화면에 되돌려준다 ("여친 생일" → "여친"). */
function detectRecipientLabel(text: string, relation: RelationKind): string | null {
  const literal = text.match(
    /여자친구|여친|남자친구|남친|아내|와이프|남편|신랑|어머니|엄마|아버지|아빠|부모님|장모님|장인어른|시어머니|시아버지|친구|동료|팀장님|딸|아들/,
  );
  if (literal) return literal[0];
  const fallback = RELATION_LABEL[relation];
  return fallback || null;
}

function nextWeekdayISO(todayISO: string, targetDow: number, mode: "auto" | "next"): string {
  const todayDow = dayOfWeek(todayISO);
  let delta = (targetDow - todayDow + 7) % 7;
  if (delta === 0) delta = 7; // "이번주 토요일"인데 오늘이 토요일이면 다음 토요일로
  if (mode === "next") delta += 7;
  return addDays(todayISO, delta);
}

function detectDate(text: string, todayISO: string): Match<string> {
  if (/모레|내일 ?모레/.test(text)) return { value: addDays(todayISO, 2), matched: true };
  if (/내일|낼/.test(text)) return { value: addDays(todayISO, 1), matched: true };
  if (/오늘|당장|지금|이따|금방/.test(text)) return { value: todayISO, matched: true };

  const inDays = text.match(/(\d+)\s*일\s*(뒤|후)/);
  if (inDays) return { value: addDays(todayISO, Number(inDays[1])), matched: true };

  const inWeeks = text.match(/(\d+)\s*주\s*(뒤|후)/);
  if (inWeeks) return { value: addDays(todayISO, Number(inWeeks[1]) * 7), matched: true };

  const absolute = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (absolute) {
    const year = Number(todayISO.slice(0, 4));
    const month = Number(absolute[1]);
    const day = Number(absolute[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const iso = daysBetween(todayISO, candidate) < 0
        ? `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : candidate;
      return { value: iso, matched: true };
    }
  }

  const nextWeek = /다음\s*주|담주/.test(text);
  for (const [dow, re] of WEEKDAY_TOKENS) {
    if (re.test(text)) {
      return { value: nextWeekdayISO(todayISO, dow, nextWeek ? "next" : "auto"), matched: true };
    }
  }
  if (/주말/.test(text)) return { value: nextWeekdayISO(todayISO, 6, nextWeek ? "next" : "auto"), matched: true };
  if (nextWeek) return { value: addDays(todayISO, 7), matched: true };
  if (/이번\s*주/.test(text)) return { value: nextWeekdayISO(todayISO, 6, "auto"), matched: true };

  return { value: addDays(todayISO, 1), matched: false };
}

function detectTime(text: string): { timeOfDay: TimeOfDay; startTime: string; matched: boolean } {
  // "오후 7시", "7시 반", "19시" — 명시된 시각이 최우선
  const explicit = text.match(/(오전|오후|저녁|밤|아침|점심)?\s*(\d{1,2})\s*시\s*(반|(\d{1,2})\s*분)?/);
  if (explicit) {
    let hour = Number(explicit[2]);
    const period = explicit[1];
    const minute = explicit[3] === "반" ? 30 : Number(explicit[4] ?? 0);
    if (hour <= 12 && (period === "오후" || period === "저녁" || period === "밤")) hour += 12;
    if (hour === 12 && period === "오전") hour = 0;
    if (hour < 12 && !period && hour >= 5 && hour <= 11) hour += 12; // "7시 예약" → 저녁으로 읽는다
    if (hour >= 0 && hour <= 23) {
      const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const minutes = timeToMinutes(startTime);
      const timeOfDay: TimeOfDay =
        minutes < 11 * 60 ? "morning"
        : minutes < 14 * 60 ? "lunch"
        : minutes < 17 * 60 ? "afternoon"
        : minutes < 21 * 60 ? "evening"
        : "night";
      return { timeOfDay, startTime, matched: true };
    }
  }

  for (const [kind, re, defaultTime] of TIME_OF_DAY_RULES) {
    if (re.test(text)) return { timeOfDay: kind, startTime: defaultTime, matched: true };
  }
  return { timeOfDay: "evening", startTime: "19:00", matched: false };
}

function detectBudget(text: string): Match<number> {
  // "10~20만원" 처럼 범위를 말하면 위쪽을 상한으로 잡는다
  const range = text.match(/(\d+)\s*[~\-–]\s*(\d+)\s*만/);
  if (range) return { value: Number(range[2]) * 10_000, matched: true };

  const eok = text.match(/(\d+)\s*억/);
  if (eok) return { value: Number(eok[1]) * 100_000_000, matched: true };

  const man = text.match(/(\d+)\s*만\s*원?/);
  if (man) return { value: Number(man[1]) * 10_000, matched: true };

  const won = text.match(/(\d{5,})\s*원/);
  if (won) return { value: Number(won[1]), matched: true };

  const cheon = text.match(/(\d+)\s*천\s*원/);
  if (cheon) return { value: Number(cheon[1]) * 1_000, matched: true };

  return { value: 0, matched: false };
}

const KOREAN_NUMBER: Record<string, number> = {
  혼자: 1, 둘: 2, 두: 2, 셋: 3, 세: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8,
};

function detectHeadcount(text: string, relation: RelationKind): Match<number> {
  const digits = text.match(/(\d{1,2})\s*(명|인)/);
  if (digits) {
    const n = Number(digits[1]);
    if (n >= 1 && n <= 30) return { value: n, matched: true };
  }
  for (const [word, n] of Object.entries(KOREAN_NUMBER)) {
    if (new RegExp(`${word}\\s*(명|이서|이)`).test(text)) return { value: n, matched: true };
  }
  if (/단둘|둘이|둘만/.test(text)) return { value: 2, matched: true };
  if (/온 ?가족|가족들/.test(text)) return { value: 4, matched: false };
  const coupleish = relation === "girlfriend" || relation === "boyfriend" || relation === "spouse";
  return { value: coupleish ? 2 : relation === "parent" ? 4 : 2, matched: false };
}

function detectNeeds(text: string, occasion: OccasionKind, relation: RelationKind): NeedKind[] {
  const needs = new Set<NeedKind>(NEEDS_BY_OCCASION[occasion]);

  // 커플 자리에는 꽃이 기본으로 들어간다. 어른·동료 자리는 아니다.
  if (occasion === "birthday" && (relation === "girlfriend" || relation === "spouse")) {
    needs.add("flower");
  }
  if (occasion === "date") needs.add("activity");

  for (const [need, re] of NEED_MENTION) {
    if (re.test(text)) needs.add(need);
  }
  for (const [need, re] of NEED_ALREADY) {
    if (re.test(text)) needs.delete(need);
  }
  return [...needs];
}

function detectList(text: string, rules: [string, RegExp][]): string[] {
  return rules.filter(([, re]) => re.test(text)).map(([label]) => label);
}

function urgencyFor(dateISO: string, todayISO: string): Urgency {
  const diff = daysBetween(todayISO, dateISO);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "this_week";
  return "later";
}

/** "여친 생일 · 내일 저녁" — 확인 화면 맨 위에 뜨는 한 줄. */
export function buildHeadline(
  brief: Pick<SituationBrief, "occasion" | "recipientLabel" | "dateISO" | "timeOfDay">,
  todayISO: string,
): string {
  return headlineFor(brief.occasion, brief.recipientLabel, brief.dateISO, todayISO, brief.timeOfDay);
}

function headlineFor(
  occasion: OccasionKind,
  recipientLabel: string | null,
  dateISO: string,
  todayISO: string,
  timeOfDay: TimeOfDay,
): string {
  const occasionLabel: Record<OccasionKind, string> = {
    birthday: "생일",
    anniversary: "기념일",
    proposal: "프로포즈",
    parents_day: "어버이날",
    date: "데이트",
    apology: "화해 자리",
    congratulation: "축하 자리",
    farewell: "송별 자리",
    other: "준비",
  };
  const timeLabel: Record<TimeOfDay, string> = {
    morning: "아침",
    lunch: "점심",
    afternoon: "오후",
    evening: "저녁",
    night: "밤",
  };
  const diff = daysBetween(todayISO, dateISO);
  const dayLabel = diff === 0 ? "오늘" : diff === 1 ? "내일" : diff === 2 ? "모레" : `${Number(dateISO.slice(5, 7))}월 ${Number(dateISO.slice(8, 10))}일`;
  const who = recipientLabel ? `${recipientLabel} ` : "";
  return `${who}${occasionLabel[occasion]} · ${dayLabel} ${timeLabel[timeOfDay]}`;
}

/** 규칙만으로 완전한 SituationBrief를 만든다. LLM이 없어도 이 결과로 앱이 돈다. */
export function parseWithRules(rawText: string, now: Date = new Date()): SituationBrief {
  const text = rawText.trim();
  const todayISO = seoulDateISO(now);

  const occasion = detectOccasion(text);
  const relation = detectRelation(text);
  const date = detectDate(text, todayISO);
  const time = detectTime(text);
  const budget = detectBudget(text);
  const headcount = detectHeadcount(text, relation.value);
  const region = detectRegion(text);
  const vibes = detectList(text, VIBE_RULES);
  const constraints = detectList(text, CONSTRAINT_RULES);
  const needs = detectNeeds(text, occasion.value, relation.value);
  const recipientLabel = detectRecipientLabel(text, relation.value);

  // 오늘인데 이미 그 시각이 지났으면 남은 시간 안에서 가능한 쪽으로 민다.
  let startTime = time.startTime;
  if (date.value === todayISO) {
    const nowMinutes = timeToMinutes(seoulTime(now));
    if (timeToMinutes(startTime) < nowMinutes + 90) {
      startTime = `${String(Math.min(22, Math.floor((nowMinutes + 120) / 60))).padStart(2, "0")}:00`;
    }
  }

  const missing: MissingField[] = [];
  if (!date.matched) missing.push("date");
  if (!region) missing.push("region");
  if (!budget.matched) missing.push("budget");
  if (!relation.matched && occasion.value !== "other") missing.push("relation");

  let confidence = 0.35;
  if (occasion.matched) confidence += 0.2;
  if (date.matched) confidence += 0.15;
  if (relation.matched) confidence += 0.12;
  if (region) confidence += 0.1;
  if (budget.matched) confidence += 0.06;
  if (time.matched) confidence += 0.05;

  return {
    rawText: text,
    occasion: occasion.value,
    headline: headlineFor(occasion.value, recipientLabel, date.value, todayISO, time.timeOfDay),
    relation: relation.value,
    recipientLabel,
    dateISO: date.value,
    timeOfDay: time.timeOfDay,
    startTime,
    urgency: urgencyFor(date.value, todayISO),
    regionLabel: region?.label ?? "서울 강남·서초",
    regionKey: region?.key ?? "seoul-gangnam",
    budgetKrw: budget.matched ? budget.value : BASE_BUDGET[occasion.value],
    budgetStated: budget.matched,
    headcount: headcount.value,
    vibes,
    needs,
    constraints,
    notes: "",
    confidence: Math.min(0.95, confidence),
    missing: missing.slice(0, 3),
    source: "rules",
  };
}

export const RULE_DEFAULT_BUDGET = BASE_BUDGET;
