import type { CallRecord } from "./operations-analytics";
import { isEnglishUi } from "./locale";
import {
  buildRequestVerificationStatus,
  type VerificationItemState,
} from "./request-verification-status";

export type TrustScoreBand = "high" | "review" | "manual";

export type TrustScoreFactor = {
  key: string;
  label: string;
  state: VerificationItemState;
  points: number;
  maxPoints: number;
};

export type RequestTrustScore = {
  score: number;
  maxScore: number;
  band: TrustScoreBand;
  bandLabel: string;
  factors: TrustScoreFactor[];
  hasLinkedCall: boolean;
};

const TRUST_CRITERIA_COUNT = 6;
const POINTS_PER_CRITERION = 100 / TRUST_CRITERIA_COUNT;

/** Shop-facing bar — 80+ is treated as sufficient to proceed. */
export const TRUST_SCORE_SUFFICIENT_MIN = 80;

const TRUST_SCORE_BAND_LABELS_EN: Record<TrustScoreBand, string> = {
  high: "Very high",
  review: "Good to review",
  manual: "Needs a quick check",
};

const TRUST_SCORE_BAND_LABELS_KO: Record<TrustScoreBand, string> = {
  high: "매우 높음",
  review: "충분함",
  manual: "추가 확인 필요",
};

export function trustScoreBandLabels(en = isEnglishUi()): Record<TrustScoreBand, string> {
  return en ? TRUST_SCORE_BAND_LABELS_EN : TRUST_SCORE_BAND_LABELS_KO;
}

/** @deprecated Use trustScoreBandLabels() for locale-aware labels */
export const TRUST_SCORE_BAND_LABELS = TRUST_SCORE_BAND_LABELS_KO;

export function isTrustScoreSufficient(score: number): boolean {
  return score >= TRUST_SCORE_SUFFICIENT_MIN;
}

function resolveCustomerConfirmation(call: CallRecord | undefined, en: boolean): VerificationItemState {
  if (!call) return "not_verified";
  if (call.verificationComplete === true) return "verified";
  return "not_verified";
}

function pointsForState(state: VerificationItemState): number {
  if (state === "verified") return POINTS_PER_CRITERION;
  return 0;
}

export function resolveTrustScoreBand(score: number): TrustScoreBand {
  if (score >= 95) return "high";
  if (score >= 80) return "review";
  return "manual";
}

export function buildRequestTrustScore(
  call: CallRecord | undefined,
  en = isEnglishUi(),
): RequestTrustScore {
  const verification = buildRequestVerificationStatus(call);
  const confirmationState = resolveCustomerConfirmation(call, en);
  const bandLabels = trustScoreBandLabels(en);

  const factors: TrustScoreFactor[] = [
    ...verification.items.map((item) => ({
      key: item.key,
      label: item.label,
      state: item.state,
      points: pointsForState(item.state),
      maxPoints: POINTS_PER_CRITERION,
    })),
    {
      key: "customerConfirmation",
      label: en ? "Customer confirmed details" : "고객 확인 완료",
      state: confirmationState,
      points: pointsForState(confirmationState),
      maxPoints: POINTS_PER_CRITERION,
    },
  ];

  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const band = resolveTrustScoreBand(score);

  return {
    score,
    maxScore: 100,
    band,
    bandLabel: bandLabels[band],
    factors,
    hasLinkedCall: verification.hasLinkedCall,
  };
}
