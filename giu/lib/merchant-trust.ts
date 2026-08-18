import type { GiuLocale } from "./i18n";
import { t } from "./i18n";
import type { GiuMerchant, GiuReview } from "./types";

/** Launch-season default while review volume is low. */
export const MERCHANT_TRUST_LAUNCH_DEFAULT = 80;

const BAD_REVIEW_HINTS = [
  "최악",
  "불친절",
  "상했",
  "못 먹",
  "이상",
  "더럽",
  "불쾌",
  "실망",
  "환불",
  "다신",
];

export type MerchantTrustTone = "good" | "ok" | "caution";

export type MerchantTrustInfo = {
  percent: number;
  tone: MerchantTrustTone;
  labelKey: "trustGood" | "trustOk" | "trustCaution";
  hintKey: "trustHintLaunch" | "trustHintGood" | "trustHintOk" | "trustHintCaution";
};

function toneFromPercent(percent: number): MerchantTrustInfo["labelKey"] {
  if (percent >= 75) return "trustGood";
  if (percent >= 58) return "trustOk";
  return "trustCaution";
}

function hintFromPercent(percent: number, reviewCount: number): MerchantTrustInfo["hintKey"] {
  if (reviewCount < 3) return "trustHintLaunch";
  if (percent >= 75) return "trustHintGood";
  if (percent >= 58) return "trustHintOk";
  return "trustHintCaution";
}

export function computeMerchantTrust(
  merchant: Pick<GiuMerchant, "rating" | "reviewCount" | "verified">,
  reviews: Pick<GiuReview, "rating" | "comment">[] = [],
): MerchantTrustInfo {
  if (merchant.reviewCount < 3) {
    return {
      percent: MERCHANT_TRUST_LAUNCH_DEFAULT,
      tone: "good",
      labelKey: "trustGood",
      hintKey: "trustHintLaunch",
    };
  }

  const ratingPercent = Math.round((merchant.rating / 5) * 100);
  let percent = Math.round(
    MERCHANT_TRUST_LAUNCH_DEFAULT * 0.35 + ratingPercent * 0.65,
  );

  const badSignals = reviews.filter((r) => {
    if (r.rating <= 2) return true;
    const c = r.comment?.toLowerCase() ?? "";
    return BAD_REVIEW_HINTS.some((w) => c.includes(w));
  }).length;

  if (badSignals >= 2) {
    percent = Math.min(percent, 52);
  } else if (badSignals === 1) {
    percent = Math.min(percent, 64);
  }

  percent = Math.max(38, Math.min(98, percent));

  const tone: MerchantTrustTone =
    percent >= 75 ? "good" : percent >= 58 ? "ok" : "caution";

  return {
    percent,
    tone,
    labelKey: toneFromPercent(percent),
    hintKey: hintFromPercent(percent, merchant.reviewCount),
  };
}

export function trustLabel(locale: GiuLocale, key: MerchantTrustInfo["labelKey"]): string {
  return t(locale, key);
}

export function trustHint(locale: GiuLocale, key: MerchantTrustInfo["hintKey"]): string {
  return t(locale, key);
}
