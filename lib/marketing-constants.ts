import { IS_BETA } from "./beta";

import { isEnglishUi } from "./locale";

export function getCheckoutCta(): string {
  if (isEnglishUi()) {
    return IS_BETA ? "Start free" : "Get started";
  }
  return IS_BETA ? "무료로 시작하기" : "결제하고 시작하기";
}

/** Primary brand slogan — Efficiency + Road */
export function getSiteTagline(): string {
  if (isEnglishUi()) {
    return "The Road to Efficiency";
  }
  return "효율로 가는 길";
}

export function getBrandLogoTagline(): string {
  return "efficiency · booking";
}

export function getSectionLabels() {
  if (isEnglishUi()) {
    return { process: "Process", features: "Features", signup: "Get started" } as const;
  }
  return { process: "프로세스", features: "기능", signup: "시작 방법" } as const;
}
