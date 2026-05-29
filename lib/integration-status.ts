import type { ShopState } from "./types";

export type IntegrationSection = "schedule" | "jobber" | "phone";

export type IntegrationItem = {
  id: IntegrationSection;
  label: string;
  done: boolean;
  summary: string;
};

export function getIntegrationItems(
  shop: ShopState,
  extras?: { jobberConnected?: boolean },
): IntegrationItem[] {
  const scheduleDone =
    shop.answerScheduleActive && shop.scheduleWindows.length > 0;
  const jobberLinked =
    Boolean(extras?.jobberConnected) || Boolean(shop.jobberConnected);
  const jobberDone = shop.jobberSetupConfirmed === true && jobberLinked;
  const phoneDone = shop.forwardingDone;

  return [
    {
      id: "schedule",
      label: "AI 수신 시간대",
      done: scheduleDone,
      summary: scheduleDone
        ? shop.scheduleWindows.map((w) => w.label).join(" · ")
        : "요일과 시간을 설정해 주세요",
    },
    {
      id: "jobber",
      label: "Jobber",
      done: jobberDone,
      summary: jobberDone
        ? "Jobber 계정 연결됨"
        : jobberLinked
          ? "Jobber 연결됨 — 확인을 눌러 주세요"
          : "Jobber 계정을 연결해 주세요",
    },
    {
      id: "phone",
      label: "콜 포워딩",
      done: phoneDone,
      summary: phoneDone
        ? "포워딩 설정 완료"
        : "야간·overflow 번호를 Vowpath로 포워딩",
    },
  ];
}

export function countComplete(items: IntegrationItem[]) {
  return items.filter((item) => item.done).length;
}

export function isFullyLive(shop: ShopState, jobberConnected?: boolean) {
  const items = getIntegrationItems(shop, { jobberConnected });
  return items.every((item) => item.done);
}

export function settingsSectionHref(section: IntegrationSection) {
  return `/settings?section=${section}`;
}
