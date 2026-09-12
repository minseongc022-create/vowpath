import type { PermissionKey } from "./permission-labels";

/**
 * 신뢰도 엔진의 순수 판단 로직.
 *
 * ★ 왜 trust.ts에서 떼어냈는가
 *
 * trust.ts는 prisma를 물고 DB에서 신호를 모은다. 그 안에 "언제 무엇을
 * 제안할지"를 정하는 규칙까지 같이 두면, 규칙 하나를 확인하려고 매번
 * 데이터베이스를 준비해야 한다. 이 파일은 순수하다 — 숫자를 넣으면 판단을
 * 돌려준다. `repair/risk.ts`가 AI 없이 위험도를 규칙으로 정하는 것과 같은
 * 이유로, 여기도 규칙을 코드로 고정해 테스트로 지킨다.
 *
 * ★ 이 파일이 지키는 것
 *
 * 1. 표본이 모자라면 `ready: false`를 주고 숫자를 보여주지 않는다.
 * 2. 사다리는 한 칸씩만 오른다 — 이미 켠 단계를 다시 권하거나 두 단계를
 *    건너뛰어 권하지 않는다.
 * 3. 임계값은 위로 갈수록(되돌리기 어려운 행동일수록) 엄격해진다.
 * 4. 이 파일은 어떤 권한도 켜지 않는다. `TrustSuggestion`은 문구일 뿐이고,
 *    실제로 켜는 것은 언제나 사람이 누른 버튼이다.
 */

export const MIN_SAMPLES_FOR_RATE = 5;

export type TrustSignalKey = "incident_accuracy" | "repair_success" | "low_risk_repair_success";

export type TrustSignal = {
  key: TrustSignalKey;
  label: string;
  ready: boolean;
  value: number | null;
  samples: number;
  minSamples: number;
  detail: string;
};

export type TrustSuggestion = {
  key: PermissionKey | "autoApplyLowRisk";
  title: string;
  reason: string;
};

export type TrustLadderInput = {
  permissions: { diagnose: boolean; proposePr: boolean; applyFix: boolean; autoApplyLowRisk: boolean };
  incidentAccuracy: number | null;
  incidentSamples: number;
  incidentConfirmedReal: number;
  repairSuccessRate: number | null;
  repairSamples: number;
  repairVerified: number;
  repairNote: string;
  lowRiskRate: number | null;
  lowRiskSamples: number;
  lowRiskVerified: number;
};

function signal(params: {
  key: TrustSignalKey;
  label: string;
  value: number | null;
  samples: number;
  detail: string;
}): TrustSignal {
  return {
    key: params.key,
    label: params.label,
    ready: params.samples >= MIN_SAMPLES_FOR_RATE,
    value: params.value,
    samples: params.samples,
    minSamples: MIN_SAMPLES_FOR_RATE,
    detail: params.detail,
  };
}

export function evaluateTrustLadder(input: TrustLadderInput): {
  signals: TrustSignal[];
  suggestion: TrustSuggestion | null;
} {
  const signals: TrustSignal[] = [
    signal({
      key: "incident_accuracy",
      label: "장애 판정 정확도",
      value: input.incidentAccuracy,
      samples: input.incidentSamples,
      detail:
        input.incidentSamples >= MIN_SAMPLES_FOR_RATE
          ? `확인된 알림 ${input.incidentSamples}건 중 ${input.incidentConfirmedReal}건이 실제 문제였습니다.`
          : `아직 ${input.incidentSamples}건뿐입니다. ${MIN_SAMPLES_FOR_RATE}건부터 정확도를 보여드립니다.`,
    }),
    signal({
      key: "repair_success",
      label: "수정 성공률",
      value: input.repairSuccessRate,
      samples: input.repairSamples,
      detail: input.repairNote,
    }),
    signal({
      key: "low_risk_repair_success",
      label: "LOW 위험 수정 성공률",
      value: input.lowRiskRate,
      samples: input.lowRiskSamples,
      detail:
        input.lowRiskSamples >= MIN_SAMPLES_FOR_RATE
          ? `LOW 위험으로 분류된 수정 ${input.lowRiskSamples}건 중 ${input.lowRiskVerified}건이 실제로 고쳐졌습니다.`
          : `LOW 위험 수정 사례가 아직 ${input.lowRiskSamples}건뿐입니다. 자동 적용을 판단하려면 ${MIN_SAMPLES_FOR_RATE}건이 필요합니다.`,
    }),
  ];

  // 사다리는 한 칸씩만. 다음 단계를 하나 찾으면 거기서 멈춘다 — 두 단계를
  // 한꺼번에 권하면 사람이 검토를 건너뛰기 쉬워진다.
  let suggestion: TrustSuggestion | null = null;
  const { permissions } = input;

  if (!permissions.diagnose) {
    suggestion = null; // 감시조차 아직이면 제안할 게 없다.
  } else if (!permissions.proposePr) {
    if (input.incidentSamples >= MIN_SAMPLES_FOR_RATE && (input.incidentAccuracy ?? 0) >= 0.75) {
      suggestion = {
        key: "proposePr",
        title: "수정안 PR로 올리기",
        reason: `지금까지 장애 알림의 ${Math.round((input.incidentAccuracy ?? 0) * 100)}%가 실제 문제였습니다. 원인 분석 다음 단계인 수정안 PR을 고려해보실 수 있습니다.`,
      };
    }
  } else if (!permissions.applyFix) {
    if (input.repairSamples >= MIN_SAMPLES_FOR_RATE && (input.repairSuccessRate ?? 0) >= 0.6) {
      suggestion = {
        key: "applyFix",
        title: "확인한 수정 적용하기",
        reason: `지금까지 만든 수정안 중 ${input.repairVerified}/${input.repairSamples}건이 실제로 문제를 고쳤습니다. 검증을 통과한 수정을 직접 적용하는 단계를 고려해보실 수 있습니다.`,
      };
    }
  } else if (!permissions.autoApplyLowRisk) {
    if (input.lowRiskSamples >= MIN_SAMPLES_FOR_RATE && (input.lowRiskRate ?? 0) >= 0.8) {
      suggestion = {
        key: "autoApplyLowRisk",
        title: "LOW 위험 수정은 묻지 않고 적용",
        reason: `LOW 위험으로 분류된 수정 ${input.lowRiskSamples}건이 모두(또는 대부분) 실제로 고쳐졌습니다. 이 등급만 자동 적용을 고려해보실 수 있습니다 — MEDIUM·HIGH는 이 설정과 무관하게 항상 사람이 확인합니다.`,
      };
    }
  }

  return { signals, suggestion };
}
