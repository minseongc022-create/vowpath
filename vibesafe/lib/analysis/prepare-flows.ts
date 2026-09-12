/**
 * AI 응답 → 실행 가능한 흐름으로 바꾸는 순수 변환.
 *
 * analyze.ts에서 떼어낸 이유는 두 가지다.
 *  1) 이 변환이 안전 규칙을 강제하는 자리라 테스트가 반드시 있어야 하는데,
 *     analyze.ts는 "server-only"와 DB를 물고 있어 Next 밖에서 못 불러온다.
 *  2) 순수 함수는 순수한 곳에 둔다 — 네트워크도 DB도 여기 없다.
 */
import { assessFlowRisk } from "../flows/safety";
import { normalizeStep, type NormalizedStep } from "../flows/steps";
import type { AnalysisResponse } from "./prompt";

const MAX_FLOWS = 6;
const MAX_STEPS_PER_FLOW = 12;

function normalizeKey(raw: string, index: number): string {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return key || `flow_${index + 1}`;
}

/** goto의 경로는 상대 경로만 받는다 — 절대 URL을 받으면 남의 사이트로 보낼 수 있다. */
function sanitizeGotoValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed.slice(0, 500);
  return null;
}

type PreparedFlow = {
  key: string;
  title: string;
  description: string;
  category: string;
  riskLevel: string;
  riskReason: string | null;
  steps: NormalizedStep[];
};

/**
 * AI 응답을 우리가 실행할 수 있고 안전한 모양으로 정리한다.
 *
 * ★ AI가 매긴 riskLevel은 버린다
 *
 * 참고는 하지만 최종 판단은 항상 우리 규칙(flows/safety.ts)이 한다. 모델이
 * 바뀌든, 프롬프트가 새든, 사용자가 이상한 저장소를 넣든, 결제 버튼을 누르는
 * 흐름이 실행 가능한 상태로 저장되는 경로는 없어야 한다.
 */
export function prepareFlows(response: AnalysisResponse): PreparedFlow[] {
  const prepared: PreparedFlow[] = [];
  const usedKeys = new Set<string>();

  for (const [index, flow] of (response.flows ?? []).slice(0, MAX_FLOWS).entries()) {
    const steps: NormalizedStep[] = [];
    for (const rawStep of (flow.steps ?? []).slice(0, MAX_STEPS_PER_FLOW)) {
      const step = normalizeStep(rawStep);
      if (!step) continue;
      if (step.action === "goto") {
        const value = sanitizeGotoValue(step.value);
        if (!value) continue;
        step.value = value;
      }
      steps.push(step);
    }
    // 확인 단계(expect_*)가 하나도 없으면 "열리기만 하면 통과"라 의미가 없다.
    const hasAssertion = steps.some((s) => s.action.startsWith("expect_"));
    if (steps.length < 2 || !hasAssertion) continue;

    let key = normalizeKey(flow.key ?? "", index);
    while (usedKeys.has(key)) key = `${key}_${usedKeys.size + 1}`;
    usedKeys.add(key);

    const risk = assessFlowRisk({
      title: flow.title ?? key,
      description: flow.description,
      category: flow.category,
      steps,
    });

    prepared.push({
      key,
      title: (flow.title ?? key).trim().slice(0, 80),
      description: (flow.description ?? "").trim().slice(0, 300),
      category: flow.category ?? "other",
      riskLevel: risk.level,
      riskReason: risk.reason,
      steps,
    });
  }
  return prepared;
}
