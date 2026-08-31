export type PlanId = "lite" | "standard" | "pro";

export type PlanDef = {
  id: PlanId;
  name: string;
  audience: string;
  priceWon: number;
  priceLabel: string;
  projectsLimit: number;
  cosPerMonth: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
};

/**
 * Pricing vs missed change-order money.
 * One missed ₩50만 CO pays for a year of Standard.
 * Gross margin mostly software (SMS/Alimtalk tiny).
 */
export const PLANS: PlanDef[] = [
  {
    id: "lite",
    name: "라이트",
    audience: "1인 시공·소형 리모델링",
    priceWon: 39000,
    priceLabel: "39,000",
    projectsLimit: 8,
    cosPerMonth: 40,
    blurb: "카톡 합의 대신 서명 링크만",
    features: [
      "현장 8곳",
      "월 변경합의 40건",
      "고객 승인 링크(앱 없음)",
      "사진·금액·공기연장 기록",
      "PDF/텍스트 합의서 복사",
    ],
  },
  {
    id: "standard",
    name: "스탠다드",
    audience: "인테리어·개보수 팀 (가장 많음)",
    priceWon: 69000,
    priceLabel: "69,000",
    projectsLimit: 30,
    cosPerMonth: 150,
    blurb: "미승인 추가공사 제로가 목표",
    highlight: true,
    features: [
      "현장 30곳 · 월 150건",
      "미승인만 모아보기",
      "승인액 월간 합계",
      "담당 2명",
      "알림톡/문자 발송 준비",
    ],
  },
  {
    id: "pro",
    name: "프로",
    audience: "다수 현장·협력사",
    priceWon: 99000,
    priceLabel: "99,000",
    projectsLimit: 80,
    cosPerMonth: 400,
    blurb: "현장 많은 팀의 변경대장",
    features: [
      "현장 80곳 · 월 400건",
      "스탠다드 전체",
      "협력사·담당 5명",
      "CSV 변경대장 export",
      "우선 온보딩",
    ],
  },
];

export function getPlan(id?: string) {
  return PLANS.find((p) => p.id === id) || PLANS[1];
}
