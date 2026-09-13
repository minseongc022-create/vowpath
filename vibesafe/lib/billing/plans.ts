/**
 * 요금제 — 순수 설정.
 *
 * ★ "server-only"가 없는 이유
 *
 * 가격·한도는 결제 화면과 계정 화면 양쪽에서 보여줘야 한다. DB나 비밀값을
 * 물지 않는 순수 데이터라, `permission-labels.ts`와 같은 이유로 클라이언트
 * 컴포넌트도 그대로 import한다.
 *
 * ★ 가격은 환경변수로 올릴 수 있게 뒀다
 *
 * 가격을 바꾸는 건 배포가 아니라 사업 결정이어야 한다. 코드를 고치고
 * 다시 배포하지 않고도 값을 바꿀 수 있게, `usage.ts`의 한도 값과 같은
 * 방식(환경변수 우선, 없으면 기본값)을 쓴다.
 */

export type PlanKey = "beta" | "pro";

export type PlanLimits = {
  projects: number;
  testRunsPerMonth: number;
  aiAnalysesPerMonth: number;
  browserMsPerMonth: number;
};

export type Plan = {
  key: PlanKey;
  title: string;
  /** 월 결제 금액(원). 0이면 무료. */
  priceKrw: number;
  tagline: string;
  limits: PlanLimits;
  /** 화면에 그대로 나열할 항목들 */
  features: string[];
};

function envNum(key: string, fallback: number): number {
  const raw = Number(process.env[key]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function getPlan(key: string): Plan {
  return PLANS[key as PlanKey] ?? PLANS.beta;
}

/**
 * ★ PRO 가격은 default 19,900원으로 뒀다
 *
 * 이 제품을 쓰는 사람은 1인 개발자·비개발자다. 기존 국내 인디 SaaS 구독료
 * 관행(1~3만원대)에 맞춰 잡은 추정값이지, 시장 조사를 거친 확정가가
 * 아니다. `VIBESAFE_PRO_PRICE_KRW` 환경변수로 언제든 바꿀 수 있다.
 */
export const PLANS: Record<PlanKey, Plan> = {
  beta: {
    key: "beta",
    title: "무료 베타",
    priceKrw: 0,
    tagline: "핵심 기능을 가볍게 먼저 써본다",
    limits: {
      projects: envNum("VIBESAFE_LIMIT_PROJECTS", 3),
      testRunsPerMonth: envNum("VIBESAFE_LIMIT_TEST_RUNS", 300),
      aiAnalysesPerMonth: envNum("VIBESAFE_LIMIT_AI_ANALYSES", 30),
      browserMsPerMonth: envNum("VIBESAFE_LIMIT_BROWSER_MS", 2 * 60 * 60 * 1000),
    },
    features: [
      "앱 3개까지",
      "월 검사 300회",
      "월 앱 분석 30회",
      "감시·알림·이력 전부 포함",
    ],
  },
  pro: {
    key: "pro",
    title: "프로",
    priceKrw: envNum("VIBESAFE_PRO_PRICE_KRW", 19_900),
    tagline: "앱이 여러 개거나 자주 확인해야 할 때",
    limits: {
      projects: envNum("VIBESAFE_PRO_LIMIT_PROJECTS", 10),
      testRunsPerMonth: envNum("VIBESAFE_PRO_LIMIT_TEST_RUNS", 3000),
      aiAnalysesPerMonth: envNum("VIBESAFE_PRO_LIMIT_AI_ANALYSES", 300),
      browserMsPerMonth: envNum("VIBESAFE_PRO_LIMIT_BROWSER_MS", 20 * 60 * 60 * 1000),
    },
    features: [
      "앱 10개까지",
      "월 검사 3,000회",
      "월 앱 분석 300회",
      "무료 베타의 모든 기능 포함",
    ],
  },
};

/** 결제 화면에 보여줄 원 단위 표시. */
export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
