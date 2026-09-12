import { particle } from "../korean";
import type { UiMode } from "../ui-mode";
import { stageLabel, stepIndex, type RepairStatus } from "./pipeline";
import type { RepairRisk } from "./risk";

/**
 * 같은 사실을 두 가지 말로 옮기는 자리.
 *
 * ★ 간편 모드는 "덜 보여주는 모드"가 아니라 "다른 말로 보여주는 모드"다
 *
 * 정보를 지우지 않는다. 커밋 해시도, PR 번호도, 스택 트레이스도 다 있다 —
 * [기술 상세 보기] 안에 있을 뿐이다. 지웠다면 그건 사용자를 보호한 게 아니라
 * 사용자가 자기 서비스에 무슨 일이 일어났는지 못 보게 만든 것이다.
 *
 * ★ 문장을 여기 모아두는 이유
 *
 * 화면마다 "고쳤습니다"를 각자 쓰면, 언젠가 한 화면이 머지만 하고도
 * "고쳤습니다"라고 말하게 된다. 말은 한 곳에서만 만든다.
 */

export const RISK_LABELS: Record<RepairRisk, Record<UiMode, { title: string; tone: "ok" | "warn" | "down" }>> = {
  low: {
    simple: { title: "간단한 수정", tone: "ok" },
    expert: { title: "LOW", tone: "ok" },
  },
  medium: {
    simple: { title: "확인이 필요한 수정", tone: "warn" },
    expert: { title: "MEDIUM", tone: "warn" },
  },
  high: {
    simple: { title: "조심해야 하는 수정", tone: "down" },
    expert: { title: "HIGH", tone: "down" },
  },
};

export function riskLabel(risk: string, mode: UiMode) {
  const entry = RISK_LABELS[risk as RepairRisk];
  return entry ? entry[mode] : { title: risk, tone: "warn" as const };
}

/**
 * 지금 이 수정이 어디까지 왔는지 한 문장.
 *
 * ★ 절대 앞서 말하지 않는다
 *
 * applied(머지됨)에서 "고쳤습니다"라고 쓰면 안 된다. 배포가 아직 안 나갔을
 * 수도, 나갔는데 여전히 깨져 있을 수도 있다. verified에서만 고쳤다고 한다.
 */
export function repairHeadline(params: {
  status: string;
  mode: UiMode;
  flowTitle: string;
  roleTitle: string | null;
}): string {
  const who = params.roleTitle ? `${params.roleTitle}${particle(params.roleTitle, "이/가")} ` : "";
  const what = `"${params.flowTitle}"`;
  const whatSubject = `${what}${particle(what, "이/가")}`;
  const whatObject = `${what}${particle(what, "을/를")}`;

  if (params.mode === "expert") return stageLabel(params.status, "expert");

  switch (params.status as RepairStatus) {
    case "draft":
      return `${what} 문제를 고칠 방법을 찾고 있습니다.`;
    case "proposed":
    case "opened":
      return `${what} 문제를 고칠 방법을 찾았습니다. 아직 서비스는 그대로입니다.`;
    case "verifying":
      return `고친 내용이 실제로 되는지 미리 확인하고 있습니다. 서비스는 아직 그대로입니다.`;
    case "ready_to_apply":
      return `미리 확인해봤더니 ${who}${whatObject} 다시 할 수 있습니다. 적용할 준비가 됐습니다.`;
    case "needs_human":
      return `자동으로는 확인이 안 됐습니다. 내용을 직접 봐주셔야 합니다.`;
    case "applying":
      return `적용하고 있습니다.`;
    case "applied":
      return `적용했습니다. 배포가 끝나면 실제 서비스에서 다시 확인하겠습니다. 아직 "고쳐졌다"고 말씀드릴 단계는 아닙니다.`;
    case "verified":
      return `고쳤습니다. 실제 서비스에서 ${who}${whatObject} 다시 할 수 있는 것을 확인했습니다.`;
    case "rejected":
      return `이 수정은 적용하지 않기로 하셨습니다.`;
    case "failed":
      return `자동으로 고치지 못했습니다.`;
    case "superseded":
      return `더 나중에 만든 수정으로 대체되었습니다.`;
    default:
      return stageLabel(params.status, "simple");
  }
}

/**
 * 검증 결과를 사람 말로.
 *
 * "affectedFlowPassed: true, regressionPassed: true"는 정보지만 문장이 아니다.
 */
/** 따옴표로 감싼 이름 + 알맞은 조사. */
function quoted(name: string, kind: "이/가" | "을/를"): string {
  const text = `"${name}"`;
  return `${text}${particle(text, kind)}`;
}

export function verifySentences(params: {
  mode: UiMode;
  flowTitle: string;
  affectedFlowPassed: boolean | null;
  regressionPassed: boolean | null;
  buildPassed: boolean | null;
  otherFlowCount: number;
}): { text: string; ok: boolean | null }[] {
  const out: { text: string; ok: boolean | null }[] = [];

  out.push({
    ok: params.affectedFlowPassed,
    text:
      params.affectedFlowPassed === true
        ? `깨졌던 ${quoted(params.flowTitle, "이/가")} 미리보기에서 다시 됩니다`
        : params.affectedFlowPassed === false
          ? `깨졌던 ${quoted(params.flowTitle, "이/가")} 미리보기에서도 여전히 안 됩니다`
          : `깨졌던 ${quoted(params.flowTitle, "을/를")} 미리보기에서 확인하지 못했습니다`,
  });

  out.push({
    ok: params.regressionPassed,
    text:
      params.regressionPassed === true
        ? `나머지 기능 ${params.otherFlowCount}개는 그대로 잘 됩니다`
        : params.regressionPassed === false
          ? `이 수정 때문에 다른 기능이 깨집니다`
          : `비교할 다른 기능이 없어 확인하지 못했습니다`,
  });

  out.push({
    ok: params.buildPassed,
    text:
      params.buildPassed === true
        ? params.mode === "simple"
          ? "코드에 문제가 없는지 저장소 검사도 통과했습니다"
          : "저장소 CI 통과"
        : params.buildPassed === false
          ? params.mode === "simple"
            ? "저장소 검사에서 오류가 나왔습니다"
            : "저장소 CI 실패"
          : params.mode === "simple"
            ? "이 저장소에는 자동 검사가 없어 확인하지 못했습니다"
            : "저장소 CI 결과 없음",
  });

  return out;
}

/** 적용 버튼의 글자. 상태에 따라 달라진다 — "적용하기"가 항상 맞는 말은 아니다. */
export function applyButtonLabel(status: string, mode: UiMode): string {
  if (status === "applying") return "적용하는 중…";
  if (mode === "expert") return "이 PR 머지하기";
  return "수정 적용하기";
}

/** 진행 막대. 0이면 그리지 않는다. */
export function progress(status: string): { index: number; total: number } {
  return { index: stepIndex(status), total: 5 };
}

/**
 * HIGH 위험 수정에 한 번 더 붙는 경고.
 *
 * 버튼을 없애지는 않는다 — 사용자 서비스이고, 사용자가 결정할 일이다. 다만
 * **무엇이 위험한지 모른 채 누르는 일**은 없어야 한다.
 */
export function highRiskWarning(riskReason: string | null): string {
  return [
    "이 수정은 로그인·결제·권한처럼 잘못되면 크게 다치는 곳을 건드립니다.",
    riskReason ?? "",
    "적용하기 전에 바뀌는 내용을 직접 확인해주세요. 자동으로는 절대 적용되지 않습니다.",
  ]
    .filter(Boolean)
    .join(" ");
}
