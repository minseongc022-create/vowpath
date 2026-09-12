/**
 * 수정 한 건의 위험도.
 *
 * ★ 왜 AI에게 묻지 않는가
 *
 * "이 수정 위험해?"라고 물으면 AI는 대체로 "안전합니다"라고 답한다. 자기가
 * 방금 쓴 코드니까. 위험도는 **수정 내용 자체**(어떤 파일을, 얼마나, 무엇을
 * 아는 상태에서 바꾸는가)로 규칙이 정한다. flows/safety.ts에서 AI가 매긴
 * 위험도를 규칙으로 덮어쓰는 것과 같은 이유다.
 *
 * 이 값이 하는 일은 하나다: **무엇을 물어보지 않고 적용해도 되는가.**
 *
 *   low     한 파일, 작은 변경, 민감하지 않은 경로, 원인이 분명함
 *           → autoApplyLowRisk를 켠 프로젝트에서만 버튼 없이 적용된다
 *   medium  기본값. 사람이 보고 [수정 적용하기]를 눌러야 한다
 *   high    로그인·결제·권한·미들웨어처럼 틀리면 크게 다치는 곳,
 *           또는 원인을 확신하지 못한 수정
 *           → 자동 적용 경로가 아예 없다. 사람이 눌러도 한 번 더 확인한다
 *
 * 판정은 **한 방향으로만** 움직인다. 어떤 신호든 위험을 올릴 수는 있어도
 * 내릴 수는 없다. 안전해 보이는 이유 열 개가 위험해 보이는 이유 하나를
 * 이기지 못하게 하려는 것이다.
 */

export type RepairRisk = "low" | "medium" | "high";

const ORDER: Record<RepairRisk, number> = { low: 0, medium: 1, high: 2 };

function raise(current: RepairRisk, next: RepairRisk): RepairRisk {
  return ORDER[next] > ORDER[current] ? next : current;
}

/**
 * 틀리면 크게 다치는 경로.
 *
 * 여기에 든 것들의 공통점: 깨졌을 때 **사용자가 눈치채기 전에 돈이나 데이터가
 * 샌다**. 로그인이 조용히 열리거나, 결제가 조용히 두 번 되거나, 남의 데이터가
 * 조용히 보인다. 화면 글자가 틀린 것과는 종류가 다르다.
 */
const HIGH_RISK_PATH = [
  /auth|login|logout|signup|session|password|token|jwt|oauth/i,
  /payment|checkout|billing|subscription|invoice|refund|결제|정산/i,
  /permission|role|admin|acl|guard|policy/i,
  /middleware\./i,
  /webhook/i,
  /crypto|encrypt|secret|sign(ature)?/i,
  /prisma|schema|migration|\bdb\b/i,
  /\/api\//i,
];

/** 고쳐도 서비스 동작이 바뀌지 않는 것들. */
const COSMETIC_PATH = [/\.(css|scss|md)$/i, /(^|\/)(styles?|locales?|i18n|messages)\//i];

export type RepairRiskInput = {
  /** 바꾸는 파일들 */
  files: { path: string; before: string; after: string }[];
  /** 진단이 원인을 얼마나 확신했는가(0~1). 모르면 null */
  confidence?: number | null;
  /** 깨진 흐름 자체의 위험도(flows/safety.ts) */
  flowRiskLevel?: string | null;
  /** 같은 장애에 대한 몇 번째 시도인가 */
  attempt?: number;
};

export type RepairRiskAssessment = {
  level: RepairRisk;
  /** 사용자에게 그대로 보여줄 한 문장 */
  reason: string;
  /** 판정에 쓰인 신호들 — 화면에서 펼쳐 보여준다 */
  signals: string[];
  changedLines: number;
};

function countChangedLines(before: string, after: string): number {
  const beforeSet = new Set(before.split("\n").map((l) => l.trim()));
  const afterLines = after.split("\n");
  const added = afterLines.filter((l) => l.trim() && !beforeSet.has(l.trim())).length;
  const afterSet = new Set(afterLines.map((l) => l.trim()));
  const removed = before
    .split("\n")
    .filter((l) => l.trim() && !afterSet.has(l.trim())).length;
  return added + removed;
}

export function assessRepairRisk(input: RepairRiskInput): RepairRiskAssessment {
  const files = input.files ?? [];
  const signals: string[] = [];
  let level: RepairRisk = "medium"; // 기본은 중간. 안전을 증명해야 low로 내려간다.

  const changedLines = files.reduce((sum, f) => sum + countChangedLines(f.before, f.after), 0);

  // --- 위험을 올리는 신호들 ---
  const sensitive = files.filter((f) => HIGH_RISK_PATH.some((re) => re.test(f.path)));
  if (sensitive.length > 0) {
    level = raise(level, "high");
    signals.push(`민감한 경로를 건드립니다: ${sensitive.map((f) => f.path).join(", ")}`);
  }

  if (files.length > 2) {
    level = raise(level, "high");
    signals.push(`파일 ${files.length}개를 동시에 바꿉니다`);
  }

  if (changedLines > 40) {
    level = raise(level, "high");
    signals.push(`바뀌는 줄이 ${changedLines}줄입니다`);
  }

  if (typeof input.confidence === "number" && input.confidence < 0.6) {
    level = raise(level, "high");
    signals.push(`원인 확신도가 낮습니다(${Math.round(input.confidence * 100)}%)`);
  }
  if (input.confidence == null) {
    // 모르는 것은 안전하지 않다. 다만 "확실히 위험"도 아니므로 medium에 묶어둔다.
    signals.push("원인 확신도를 알 수 없습니다");
  }

  if (input.flowRiskLevel === "blocked" || input.flowRiskLevel === "caution") {
    level = raise(level, "high");
    signals.push("결제·발송·삭제가 걸린 흐름과 관련된 수정입니다");
  }

  if ((input.attempt ?? 1) >= 2) {
    level = raise(level, "high");
    signals.push(`같은 문제에 대한 ${input.attempt}번째 시도입니다`);
  }

  if (files.length === 0) {
    return {
      level: "high",
      reason: "바꿀 파일이 없습니다. 적용할 수 없습니다.",
      signals: ["변경 내용이 비어 있음"],
      changedLines: 0,
    };
  }

  // --- low로 내려갈 수 있는가 ---
  // 위에서 한 번이라도 올라갔으면 여기로 오지 않는다.
  if (level === "medium") {
    const oneFile = files.length === 1;
    const small = changedLines <= 10;
    const confident = typeof input.confidence === "number" && input.confidence >= 0.8;
    const cosmetic = files.every((f) => COSMETIC_PATH.some((re) => re.test(f.path)));

    if (oneFile && small && (confident || cosmetic)) {
      level = "low";
      signals.push(
        cosmetic
          ? "화면 표시에만 관계된 파일 한 개, 작은 변경입니다"
          : "파일 한 개, 작은 변경이고 원인이 분명합니다",
      );
    }
  }

  const reason =
    level === "high"
      ? "확인 없이 적용하지 않습니다. " + (signals[0] ?? "위험 신호가 있습니다.")
      : level === "low"
        ? signals[signals.length - 1] ?? "작고 되돌리기 쉬운 변경입니다."
        : "일반적인 코드 수정입니다. 적용 전에 확인해주세요.";

  return { level, reason, signals, changedLines };
}

/**
 * 버튼 없이 적용해도 되는가.
 *
 * ★ 이 함수 하나가 "AI가 마음대로 고친다"와 "사람이 미리 허락한 범위에서만
 * 고친다"를 가른다. 조건을 늘리지 말 것.
 */
export function canAutoApply(params: {
  risk: RepairRisk;
  autoApplyLowRisk: boolean;
  verified: boolean;
  todayCount: number;
  dailyLimit: number;
}): { allowed: boolean; reason: string } {
  if (!params.autoApplyLowRisk) {
    return { allowed: false, reason: "자동 적용이 꺼져 있습니다." };
  }
  if (params.risk !== "low") {
    return { allowed: false, reason: "LOW 위험으로 분류된 수정만 자동 적용합니다." };
  }
  if (!params.verified) {
    return { allowed: false, reason: "미리보기 검증을 통과하지 못했습니다." };
  }
  if (params.todayCount >= params.dailyLimit) {
    return { allowed: false, reason: `오늘 자동 적용 한도(${params.dailyLimit}건)를 다 썼습니다.` };
  }
  return { allowed: true, reason: "LOW 위험 · 검증 통과 · 자동 적용 허용됨" };
}
