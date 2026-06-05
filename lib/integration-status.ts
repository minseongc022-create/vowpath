import { isKrSmsTestMode } from "./sms-region-config";
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
  const contactDone = extras?.contactComplete === true;
  const scheduleDone =
    shop.answerScheduleActive && shop.scheduleWindows.length > 0;
  const jobberLinked =
    Boolean(extras?.jobberConnected) || Boolean(shop.jobberConnected);
  const jobberSkipped = shop.jobberSkipped === true;
  const jobberDone =
    jobberSkipped ||
    (shop.jobberSetupConfirmed === true && jobberLinked);
  const phoneDone = shop.forwardingDone;

  return [
    {
      id: "contact",
      label: "연락처",
      done: contactDone,
      summary: contactDone
        ? isKrSmsTestMode()
          ? "이메일·휴대폰 저장됨 (개발/KR 테스트)"
          : "이메일·미국 휴대폰 저장됨"
        : isKrSmsTestMode()
          ? "알림 받을 이메일·휴대폰 입력 (010 또는 +1)"
          : "알림 받을 이메일·휴대폰(미국) 입력",
    },
    {
      id: "schedule",
      label: "AI 수신 시간대",
      done: scheduleDone,
      summary: scheduleDone
        ? shop.scheduleWindows.map((w) => w.label).join(" · ")
        : "요일과 시간을 설정해 주세요",
    },
    {
      id: "phone",
      label: "Call forwarding",
      done: phoneDone,
      summary: phoneDone
        ? shop.forwardingScenario === "after_hours"
          ? "After-hours forwarding set"
          : shop.forwardingScenario === "busy_and_after_hours"
            ? "Busy + after-hours forwarding set"
            : "Overflow forwarding set"
        : "Copy Vowpath number → set up forwarding",
    },
    {
      id: "jobber",
      label: "Jobber",
      optional: true,
      skipped: jobberSkipped && !jobberLinked,
      done: jobberDone,
      summary: jobberSkipped
        ? "건너뜀 — 나중에 연동 설정에서 연결 가능"
        : jobberDone && jobberLinked
          ? "Jobber 계정 연결됨"
          : jobberLinked
            ? "Jobber 연결됨 — 확인을 눌러 주세요"
            : "이미 Jobber 쓰는 샵만 선택 연동",
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
