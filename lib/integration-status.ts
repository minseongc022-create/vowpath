import { isKrSmsTestMode } from "./sms-region-config";

import { isEnglishUi } from "./locale";

import { sanitizeScheduleWindows } from "./shop-storage";
import type { ShopState } from "./types";



export type IntegrationSection = "contact" | "schedule" | "jobber" | "phone";



export type IntegrationItem = {

  id: IntegrationSection;

  label: string;

  done: boolean;

  summary: string;

  optional?: boolean;

  skipped?: boolean;

};



export type IntegrationExtras = {

  jobberConnected?: boolean;

  contactComplete?: boolean;

};



export function getIntegrationItems(

  shop: ShopState,

  extras?: IntegrationExtras,

): IntegrationItem[] {

  const en = isEnglishUi();

  const contactDone = extras?.contactComplete === true;

  const scheduleDone =
    shop.answerScheduleActive && sanitizeScheduleWindows(shop.scheduleWindows).length > 0;

  const jobberLinked =

    Boolean(extras?.jobberConnected) || Boolean(shop.jobberConnected);

  const jobberSkipped = shop.jobberSkipped === true;

  const jobberDone =

    jobberSkipped ||

    (shop.jobberSetupConfirmed === true && jobberLinked);

  const phoneDone = shop.forwardingDone;



  if (en) {

    return [

      {

        id: "contact",

        label: "Contact",

        done: contactDone,

        summary: contactDone

          ? isKrSmsTestMode()

            ? "Email and mobile saved (dev / KR test)"

            : "Email and US mobile saved"

          : isKrSmsTestMode()

            ? "Add alert email and mobile (010 or +1)"

            : "Add alert email and US mobile (+1)",

      },

      {

        id: "schedule",

        label: "Answer hours",

        done: scheduleDone,

        summary: scheduleDone

          ? shop.scheduleWindows.map((w) => w.label).join(" · ")

          : "Set days and times Effiroad answers",

      },

      {

        id: "phone",

        label: "Call forwarding",

        done: phoneDone,

        summary: phoneDone

          ? shop.forwardingScenario === "busy_and_after_hours"

            ? "Busy forwarding configured"

            : "No-answer forwarding configured"

          : "Copy Effiroad number and set forwarding",

      },

      {

        id: "jobber",

        label: "Jobber",

        optional: true,

        skipped: jobberSkipped && !jobberLinked,

        done: jobberDone,

        summary: jobberSkipped

          ? "Skipped — connect anytime in Integrations"

          : jobberDone && jobberLinked

            ? "Jobber account connected"

            : jobberLinked

              ? "Jobber connected — confirm setup"

              : "Optional — for shops on Jobber",

      },

    ];

  }



  return [

    {

      id: "contact",

      label: "연락처",

      done: contactDone,

      summary: contactDone

        ? isKrSmsTestMode()

          ? "이메일·휴대폰 저장됨 (개발/한국 테스트)"

          : "이메일·미국 휴대폰 저장됨"

        : isKrSmsTestMode()

          ? "알림용 이메일·휴대폰 입력 (010 또는 +1)"

          : "알림용 이메일·미국 휴대폰 입력",

    },

    {

      id: "schedule",

      label: "응대 시간",

      done: scheduleDone,

      summary: scheduleDone

        ? shop.scheduleWindows.map((w) => w.label).join(" · ")

        : "응대 요일·시간 설정",

    },

    {

      id: "phone",

      label: "착신 전환",

      done: phoneDone,

      summary: phoneDone

        ? shop.forwardingScenario === "busy_and_after_hours"

          ? "통화 중 착신 전환 설정됨"

          : "부재 시 착신 전환 설정됨"

        : "Effiroad 번호 복사 후 착신 전환 설정",

    },

    {

      id: "jobber",

      label: "Jobber",

      optional: true,

      skipped: jobberSkipped && !jobberLinked,

      done: jobberDone,

      summary: jobberSkipped

        ? "건너뜀 — 연동 설정에서 언제든 연결 가능"

        : jobberDone && jobberLinked

          ? "Jobber 계정 연결됨"

          : jobberLinked

            ? "Jobber 연결됨 — 「연결 확인」 필요"

            : "선택 — Jobber 사용 샵만 연결",

    },

  ];

}



export function countComplete(items: IntegrationItem[]) {

  return items.filter((item) => item.done).length;

}



export function countRequiredComplete(items: IntegrationItem[]) {

  return items.filter((item) => !item.optional && item.done).length;

}



export function countRequiredTotal(items: IntegrationItem[]) {

  return items.filter((item) => !item.optional).length;

}



/** Live = owner contact + schedule + call forwarding. */

export function isFullyLive(shop: ShopState, extras?: IntegrationExtras) {

  const items = getIntegrationItems(shop, extras);

  return items.filter((item) => !item.optional).every((item) => item.done);

}



export function settingsSectionHref(section: IntegrationSection) {

  return `/settings?section=${section}`;

}

