export type PlanId = "lite" | "standard" | "pro";

export type PlanDef = {
  id: PlanId;
  name: string;
  audience: string;
  priceWon: number;
  priceLabel: string;
  clientsLimit: number;
  alimtalkIncluded: number;
  overagePerMsgWon: number;
  staffSeats: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
  flags: {
    manualSend: boolean;
    bulkSend: boolean;
    submitLink: boolean;
    oneTapReply: boolean; // 이미냈어요 / 해당없음
    callQueue: boolean; // 알림톡 후 전화 잔여 큐
    autoSchedule: boolean;
    customTemplate: boolean;
    exportReport: boolean;
    multiStaff: boolean;
    smsFailover: boolean;
  };
};

/**
 * Sticker cheap · margin high
 * - Alimtalk COGS ≈ ₩13/msg → packs sized so subscription >> COGS
 * - Overage ₩29~39 keeps 55%+ message margin without looking "expensive"
 * - Software gross on Standard ≈ ₩59k − (300×13) ≈ ₩55k (≈93%)
 */
export const PLANS: PlanDef[] = [
  {
    id: "lite",
    name: "라이트",
    audience: "1인 · 소형 기장",
    priceWon: 29000,
    priceLabel: "29,000",
    clientsLimit: 30,
    alimtalkIncluded: 100,
    overagePerMsgWon: 39,
    staffSeats: 1,
    blurb: "전화 독촉만 줄이고 싶을 때",
    features: [
      "거래처 30곳",
      "제로앱 제출 링크",
      "수임처 원탭 회신(이미냈어요)",
      "알림톡 수동 발송 · 월 100건",
      "초과 건당 39원",
    ],
    flags: {
      manualSend: true,
      bulkSend: false,
      submitLink: true,
      oneTapReply: true,
      callQueue: true,
      autoSchedule: false,
      customTemplate: false,
      exportReport: false,
      multiStaff: false,
      smsFailover: true,
    },
  },
  {
    id: "standard",
    name: "스탠다드",
    audience: "소형~중형 (가장 많음)",
    priceWon: 59000,
    priceLabel: "59,000",
    clientsLimit: 80,
    alimtalkIncluded: 300,
    overagePerMsgWon: 35,
    staffSeats: 2,
    blurb: "마감 지휘소 — 알림톡→원탭→전화큐",
    highlight: true,
    features: [
      "거래처 80곳 · 담당 2명",
      "D-7/D-3/D-1 자동 독촉",
      "안 낸 곳 한꺼번에 · 전화 잔여 큐",
      "월 알림톡 300건 · 초과 35원",
      "회수율 CSV",
    ],
    flags: {
      manualSend: true,
      bulkSend: true,
      submitLink: true,
      oneTapReply: true,
      callQueue: true,
      autoSchedule: true,
      customTemplate: false,
      exportReport: true,
      multiStaff: true,
      smsFailover: true,
    },
  },
  {
    id: "pro",
    name: "프로",
    audience: "팀·세무법인 소규모",
    priceWon: 99000,
    priceLabel: "99,000",
    clientsLimit: 200,
    alimtalkIncluded: 800,
    overagePerMsgWon: 29,
    staffSeats: 5,
    blurb: "다수 수임·마감 집중",
    features: [
      "거래처 200곳 · 담당 5명",
      "스탠다드 전체 + 맞춤 문구",
      "월 알림톡 800건 · 초과 29원",
      "우선 온보딩·템플릿 심사 가이드",
    ],
    flags: {
      manualSend: true,
      bulkSend: true,
      submitLink: true,
      oneTapReply: true,
      callQueue: true,
      autoSchedule: true,
      customTemplate: true,
      exportReport: true,
      multiStaff: true,
      smsFailover: true,
    },
  },
];

export function getPlan(id: PlanId | string | undefined): PlanDef {
  return PLANS.find((p) => p.id === id) || PLANS[1];
}

export function planAllows(planId: PlanId | undefined, flag: keyof PlanDef["flags"]): boolean {
  return getPlan(planId).flags[flag];
}

export function clientsOverLimit(planId: PlanId | undefined, count: number): boolean {
  return count > getPlan(planId).clientsLimit;
}

/** Rough monthly COGS for included Alimtalk pack (₩13/msg). */
export function planMsgCogsWon(plan: PlanDef, unitCost = 13) {
  return plan.alimtalkIncluded * unitCost;
}
