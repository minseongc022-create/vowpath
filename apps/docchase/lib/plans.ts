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
  /** Feature flags */
  flags: {
    manualSend: boolean;
    bulkSend: boolean;
    submitLink: boolean; // client upload link in Alimtalk
    autoSchedule: boolean; // D-7 / D-3 / D-1
    customTemplate: boolean;
    exportReport: boolean;
    multiStaff: boolean;
  };
};

/**
 * Pricing: undercut "clerk replacement" psychology, not Clobe's free forever.
 * COGS mainly Alimtalk (~₩13). Include pack; overage ~₩20 keeps ~35%+ msg margin.
 * Subscription is mostly software gross margin.
 */
export const PLANS: PlanDef[] = [
  {
    id: "lite",
    name: "라이트",
    audience: "1인 · 소형 기장",
    priceWon: 49000,
    priceLabel: "49,000",
    clientsLimit: 25,
    alimtalkIncluded: 80,
    overagePerMsgWon: 20,
    staffSeats: 1,
    blurb: "전화 독촉만 없애고 싶을 때",
    features: [
      "거래처 25곳",
      "자료 요청·받았어요 현황판",
      "알림톡 미리보기·수동 발송",
      "월 알림톡 80건 포함",
      "초과 건당 20원",
    ],
    flags: {
      manualSend: true,
      bulkSend: false,
      submitLink: false,
      autoSchedule: false,
      customTemplate: false,
      exportReport: false,
      multiStaff: false,
    },
  },
  {
    id: "standard",
    name: "스탠다드",
    audience: "소형~중형 (사무원 1명분)",
    priceWon: 99000,
    priceLabel: "99,000",
    clientsLimit: 80,
    alimtalkIncluded: 350,
    overagePerMsgWon: 18,
    staffSeats: 2,
    blurb: "가장 많이 쓰는 마감 운영",
    highlight: true,
    features: [
      "거래처 80곳",
      "알림톡 안 제출 링크(파일 받기)",
      "D-7 · D-3 · D-1 자동 독촉",
      "안 낸 곳 한꺼번에 보내기",
      "월 알림톡 350건 포함 · 초과 18원",
      "담당 2명",
    ],
    flags: {
      manualSend: true,
      bulkSend: true,
      submitLink: true,
      autoSchedule: true,
      customTemplate: false,
      exportReport: true,
      multiStaff: true,
    },
  },
  {
    id: "pro",
    name: "프로",
    audience: "중형~세무법인 팀",
    priceWon: 179000,
    priceLabel: "179,000",
    clientsLimit: 250,
    alimtalkIncluded: 1200,
    overagePerMsgWon: 15,
    staffSeats: 5,
    blurb: "다수 수임·마감 집중 사무소",
    features: [
      "거래처 250곳",
      "스탠다드 전체 +",
      "거래처별 맞춤 문구",
      "월간 회수율 리포트·CSV",
      "월 알림톡 1,200건 · 초과 15원",
      "담당 5명 · 우선 온보딩",
    ],
    flags: {
      manualSend: true,
      bulkSend: true,
      submitLink: true,
      autoSchedule: true,
      customTemplate: true,
      exportReport: true,
      multiStaff: true,
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
