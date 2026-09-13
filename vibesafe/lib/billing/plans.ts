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
 * ★ PRO 가격은 default 29,900원으로 뒀다
 *
 * 이 제품을 쓰는 사람은 1인 개발자·비개발자다. 기존 국내 인디 SaaS 구독료
 * 관행(1~3만원대)에 맞춰 잡은 추정값이지, 시장 조사를 거친 확정가가
 * 아니다. `VIBESAFE_PRO_PRICE_KRW` 환경변수로 언제든 바꿀 수 있다.
 *
 * ★ "자동 수정"은 한도가 아니라 별도 크레딧으로 가른다
 *
 * 베타에서 자동 수정(원인 분석 후 PR 생성)은 평생 1회만 무료다 — 몇 번째
 * 사고인지와 무관하게 딱 한 번. 이건 이 표의 숫자가 아니라
 * `VibesafeUser.freeRepairUsedAt`로 관리한다(repair/propose-fix.ts).
 * 감지·원인 진단은 이 한도·크레딧과 완전히 무관하게 항상 무제한이다 —
 * "왜 고장났는지"를 유료화 지렛대로 쓰지 않는다.
 */
export const PLANS: Record<PlanKey, Plan> = {
  beta: {
    key: "beta",
    title: "무료 베타",
    priceKrw: 0,
    tagline: "핵심 기능을 가볍게 먼저 써본다",
    limits: {
      projects: envNum("VIBESAFE_LIMIT_PROJECTS", 1),
      testRunsPerMonth: envNum("VIBESAFE_LIMIT_TEST_RUNS", 100),
      aiAnalysesPerMonth: envNum("VIBESAFE_LIMIT_AI_ANALYSES", 20),
      browserMsPerMonth: envNum("VIBESAFE_LIMIT_BROWSER_MS", 3 * 60 * 60 * 1000),
    },
    features: [
      "앱 1개",
      "24/7 감지 + 원인 진단 무제한",
      "자동 수정(PR 생성) 평생 1회 무료 체험",
      "월 검사 100회 · 월 앱 분석 20회",
      "공개 상태 배지·이력 포함",
    ],
  },
  pro: {
    key: "pro",
    title: "프로",
    priceKrw: envNum("VIBESAFE_PRO_PRICE_KRW", 29_900),
    tagline: "앱이 여러 개거나 자주 확인해야 할 때",
    limits: {
      projects: envNum("VIBESAFE_PRO_LIMIT_PROJECTS", 5),
      testRunsPerMonth: envNum("VIBESAFE_PRO_LIMIT_TEST_RUNS", 2000),
      aiAnalysesPerMonth: envNum("VIBESAFE_PRO_LIMIT_AI_ANALYSES", 200),
      browserMsPerMonth: envNum("VIBESAFE_PRO_LIMIT_BROWSER_MS", 20 * 60 * 60 * 1000),
    },
    features: [
      "앱 5개까지",
      "자동 수정(PR 생성+적용) 무제한",
      "월 검사 2,000회 · 월 앱 분석 200회",
      "7일 무료체험 후 결제",
      "무료 베타의 모든 기능 포함",
    ],
  },
};

/** 결제 화면에 보여줄 원 단위 표시. */
export function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
