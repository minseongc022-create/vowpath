import { IS_BETA } from "./beta";

import { isEnglishUi } from "./locale";



export function getCheckoutCta(): string {

  if (isEnglishUi()) {

    return IS_BETA ? "Start free" : "Get started";

  }

  return IS_BETA ? "무료로 시작하기" : "결제하고 시작하기";

}



export function getSiteTagline(): string {

  if (isEnglishUi()) {

    return "Missed calls turned into booked jobs.";

  }

  return "바쁜 날·야간·현장에서도 문자로 예약 확인";

}



export function getBrandLogoTagline(): string {

  if (isEnglishUi()) {

    return "Trust, connected.";

  }

  return "신뢰가 이어지는 길";

}



export function getSectionLabels() {

  if (isEnglishUi()) {

    return { process: "Process", features: "Features", signup: "Get started" } as const;

  }

  return { process: "프로세스", features: "기능", signup: "시작 방법" } as const;

}


