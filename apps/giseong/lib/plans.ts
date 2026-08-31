export type PlanId = "lite" | "standard" | "pro";

export type PlanDef = {
  id: PlanId;
  name: string;
  audience: string;
  priceWon: number;
  priceLabel: string;
  projectsLimit: number;
  appsPerMonth: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
};

/**
 * Pricing vs progress-payment cash.
 * One delayed 기성 (수천만원대) dwarfs a year of Standard.
 * Not ERP — counterparty approve + chase only.
 */
export const PLANS: PlanDef[] = [
  {
    id: "lite",
    name: "라이트",
    audience: "1인·소형 전문건설",
    priceWon: 49000,
    priceLabel: "49,000",
    projectsLimit: 10,
    appsPerMonth: 30,
    blurb: "월 기성을 링크 승인으로",
    features: [
      "현장 10곳",
      "월 기성청구 30건",
      "발주·원청 승인 링크(앱 없음)",
      "누계·유보금 기록",
      "카톡 붙여넣기 문구",
    ],
  },
  {
    id: "standard",
    name: "스탠다드",
    audience: "전문건설·설비·전기 (가장 많음)",
    priceWon: 79000,
    priceLabel: "79,000",
    projectsLimit: 40,
    appsPerMonth: 120,
    blurb: "미승인 기성 제로가 목표",
    highlight: true,
    features: [
      "현장 40곳 · 월 120건",
      "미승인·수정요청만 모아보기",
      "승인액·유보금 월간 합계",
      "담당 3명",
      "알림톡/문자 발송 준비",
    ],
  },
  {
    id: "pro",
    name: "프로",
    audience: "다수 현장·협력사",
    priceWon: 129000,
    priceLabel: "129,000",
    projectsLimit: 100,
    appsPerMonth: 400,
    blurb: "현장 많은 팀의 기성대장",
    features: [
      "현장 100곳 · 월 400건",
      "스탠다드 전체",
      "협력사·담당 8명",
      "CSV 기성대장 export",
      "우선 온보딩",
    ],
  },
];

export function getPlan(id?: string) {
  return PLANS.find((p) => p.id === id) || PLANS[1];
}
