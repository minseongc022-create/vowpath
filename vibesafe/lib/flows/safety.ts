/**
 * 위험한 행동을 막는 자리.
 *
 * ★ 이 파일이 이 제품에서 가장 중요한 파일이다
 *
 * 우리는 남의 **운영 중인** 앱에 브라우저를 붙여 실제로 클릭한다. AI가
 * "결제 흐름을 확인하려면 결제하기를 누르면 됩니다"라고 판단하는 순간,
 * 사장님 앱에서 진짜 결제가 일어나고 진짜 문자가 나가고 진짜 예약이 잡힌다.
 * 돌이킬 수 없는 종류의 사고다.
 *
 * 그래서 AI의 판단을 신뢰하지 않는다. AI가 위험도를 매기게 하되, 그 값은
 * **참고만** 하고 여기 규칙이 항상 덮어쓴다. 규칙이 위험하다고 하면 AI가
 * 안전하다고 해도 위험한 것이다.
 *
 * 세 단계:
 *   safe    — 열기/읽기/로그인/검색처럼 되돌릴 수 있다. 바로 실행한다.
 *   caution — 글 작성처럼 데이터가 남는다. 사용자가 명시적으로 켜야 실행한다.
 *   blocked — 결제/발송/삭제/확정. MVP에서는 어떤 경우에도 실행하지 않는다.
 */

export type RiskLevel = "safe" | "caution" | "blocked";

/** 절대 실행하지 않는다 — 금전·외부효과·되돌릴 수 없는 변경. */
const BLOCKED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /결제|payment|checkout|purchase|구매|billing|카드등록|pay\b|toss|kakaopay|naverpay|stripe|paypal/i, reason: "실제 결제가 일어날 수 있는 단계입니다." },
  { re: /삭제|delete|remove|탈퇴|withdraw|destroy|계정삭제|drop\b/i, reason: "데이터가 지워질 수 있는 단계입니다." },
  { re: /문자|sms|알림톡|메시지발송|send[- ]?(sms|mail|email|message)|이메일발송|발송하기/i, reason: "실제로 문자·이메일이 발송될 수 있는 단계입니다." },
  { re: /예약확정|주문확정|결제하기|구매하기|confirm[- ]?(order|booking|payment)|place[- ]?order/i, reason: "실제 주문·예약이 확정될 수 있는 단계입니다." },
  { re: /환불|refund|취소하기|cancel[- ]?(order|booking|subscription)/i, reason: "실제 취소·환불이 일어날 수 있는 단계입니다." },
  { re: /출금|송금|transfer|withdraw(al)?\b|정산/i, reason: "실제 금전 이동이 일어날 수 있는 단계입니다." },
];

/** 데이터가 남는다 — 사용자가 직접 켜야 실행한다. */
const CAUTION_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /작성|등록|생성|만들기|올리기|업로드|post\b|create|submit|upload|publish|write/i, reason: "앱에 데이터가 새로 만들어집니다." },
  { re: /수정|변경|편집|update|edit|modify|저장하기/i, reason: "기존 데이터가 바뀝니다." },
  { re: /초대|invite|공유하기|share/i, reason: "다른 사람에게 영향이 갈 수 있습니다." },
  { re: /예약(?!.*확인)|booking|reserve/i, reason: "예약 데이터가 만들어질 수 있습니다." },
];

export type FlowLike = {
  title: string;
  description?: string | null;
  category?: string | null;
  steps: { action: string; description: string; value?: string | null; selector?: string | null }[];
};

export type RiskAssessment = { level: RiskLevel; reason: string | null };

/**
 * 흐름 전체를 보고 등급을 매긴다.
 *
 * 읽기 전용 동작(goto/expect_*)만 있는 흐름은 문구에 무슨 단어가 들어있든
 * 안전하다 — "결제 내역 확인" 같은 흐름을 이름 때문에 막으면 정작 확인해야
 * 할 것을 못 보게 된다.
 */
export function assessFlowRisk(flow: FlowLike): RiskAssessment {
  const mutatingSteps = flow.steps.filter((s) => s.action === "click" || s.action === "fill" || s.action === "press");
  if (mutatingSteps.length === 0) {
    return { level: "safe", reason: null };
  }

  // 위험 판정은 "실제로 누르거나 입력하는 것"의 문구만 본다.
  const actionText = mutatingSteps
    .map((s) => `${s.description} ${s.selector ?? ""} ${s.value ?? ""}`)
    .join(" ");
  const flowText = `${flow.title} ${flow.description ?? ""} ${flow.category ?? ""}`;

  for (const { re, reason } of BLOCKED_PATTERNS) {
    if (re.test(actionText)) return { level: "blocked", reason };
  }
  // 흐름 제목이 명백히 결제/삭제면 단계가 애매해도 막는다.
  for (const { re, reason } of BLOCKED_PATTERNS) {
    if (re.test(flowText)) return { level: "blocked", reason };
  }

  for (const { re, reason } of CAUTION_PATTERNS) {
    if (re.test(actionText)) return { level: "caution", reason };
  }

  // 로그인·검색은 입력과 클릭이 있어도 되돌릴 수 있다.
  if (/로그인|login|sign[- ]?in|검색|search|필터|filter|조회/i.test(`${flowText} ${actionText}`)) {
    return { level: "safe", reason: null };
  }

  // 여기까지 왔다면 뭘 하는지 확실하지 않은 클릭이다 — 안전한 쪽으로 기운다.
  return { level: "caution", reason: "앱 데이터에 영향을 줄 수 있는 단계가 포함되어 있습니다." };
}

/** 이 등급의 흐름을 실제로 실행해도 되는가. */
export function canExecute(riskLevel: string, status: string): boolean {
  if (riskLevel === "blocked") return false;
  return status === "active";
}

/** 사용자가 켜려고 할 때 허용되는가 — blocked는 UI에서도 켤 수 없다. */
export function canActivate(riskLevel: string): boolean {
  return riskLevel !== "blocked";
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  safe: "안전",
  caution: "확인 필요",
  blocked: "실행 제외",
};
