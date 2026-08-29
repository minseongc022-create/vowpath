/**
 * 검수 대기 문자 — 정확한 숫자로, 딱 필요할 때만
 *
 * ★ 이번 세션에 실제로 터진 사고 두 가지를 둘 다 피한다
 *
 *  1. **문자가 잘려서 뜻이 뒤집힘** — 해외발신(Twilio) SMS는 UCS-2라 67자를
 *     넘으면 여러 조각으로 쪼개지고, 국내 통신사는 그걸 재조립해주지 않는다.
 *     실제로 "승인 대기 N건 확인해주세요"만 오고 링크가 잘린 사고가 있었다.
 *     그래서 문구+URL 전체 길이를 여기서 못박고, 넘으면 **보내지 않고
 *     경고만 남긴다** — 잘린 문자가 나가는 것보다 안 나가는 게 낫다.
 *
 *  2. **옛 파이프라인이 따로 문자를 보냄** — 이 세션 전까지는 GitHub
 *     Actions가 10분마다 옛 엔진(toss-shop)을 깨워 옛 저장소 기준으로
 *     문자를 보냈다. 새 자비스로 갈아탄 뒤에도 그 워크플로가 그대로 남아
 *     있어 "2건" "15건"처럼 앞뒤가 안 맞는 문자가 겹쳐 왔다. 문자를 보내는
 *     경로가 **이 파일 하나**여야 한다 — 두 곳에서 보내면 반드시 어긋난다.
 */

import { sendSms } from "@/lib/send-sms";
import { canonicalMarketingUrl } from "@/lib/canonical-host";
import { JV_ROUTES } from "../routes";
import type { ReportWindow } from "../core/types";

export const NOTIFY_VERSION = "1.0";

/** 해외발신 SMS 1건 한도. 이 문자만이 아니라 이 프로젝트 전체가 지키는 값이다 */
export const SMS_SINGLE_SEGMENT_LIMIT = 67;

const REVIEW_URL = canonicalMarketingUrl(JV_ROUTES.review);

export type ReviewAlert = { message: string; withinLimit: boolean };

/**
 * "승인 대기 N건" 문구를 만든다.
 *
 * 999건까지도 한 세그먼트 안에 들어가게 문구를 짧게 잡아뒀다 — 숫자 자릿수가
 * 늘어도 문구 앞부분("승인 대기 확인해주세요")만 읽혀도 뜻이 통해야 한다.
 */
export function buildReviewAlert(pendingCount: number): ReviewAlert {
  const message = `[자비스] 승인 대기 ${pendingCount}건 확인해주세요\n${REVIEW_URL}`;
  return { message, withinLimit: message.length <= SMS_SINGLE_SEGMENT_LIMIT };
}

/**
 * 검수 대기 문자를 보낸다. 실패해도 자동 운전 사이클 자체는 죽지 않는다 —
 * 문자 발송 실패가 소싱·초안 생성을 막을 이유는 없다.
 */
export async function sendReviewAlert(
  phone: string,
  pendingCount: number,
): Promise<{ sent: boolean; reason: string }> {
  const alert = buildReviewAlert(pendingCount);

  if (!alert.withinLimit) {
    // 여기 걸리면 문구 자체를 줄여야 하는 코드 결함이다 — 숫자를 바꿔서
    // 넘긴다고 해결되지 않는다.
    console.error(
      `[jarvis/notify] 문자가 ${alert.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT}자)를 넘어 보내지 않았습니다`,
    );
    return { sent: false, reason: "MESSAGE_TOO_LONG" };
  }

  try {
    const result = await sendSms(phone, alert.message, "jarvis-review-alert");
    if (!result.ok) return { sent: false, reason: result.error };
    return { sent: true, reason: "OK" };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "SEND_FAILED" };
  }
}

/** 30분마다: 이 창 동안 자비스가 실제로 무엇을 했는지 */
export const REPORT_INTERVAL_MS = 30 * 60 * 1000;

export type PeriodicReport = { message: string; withinLimit: boolean };

/**
 * "30분간 몇 번 돌았고 뭘 찾았는지"를 한 줄에 담는다.
 *
 * 숫자가 999까지 세 자리로 커져도(현실적으로 그럴 일은 없지만) 한 세그먼트
 * 안에 들어가도록 문구를 미리 재보고 정했다 — jarvis-report.test.mjs에서
 * 그 최악의 경우를 실제로 잰다.
 */
export function buildPeriodicReport(
  window: Pick<ReportWindow, "cyclesRun" | "productsSeen" | "candidatesFound" | "draftsCreated">,
  goal: { skusNow: number; skusNeeded: number },
): PeriodicReport {
  const message =
    `[자비스] 30분 보고 · 소싱 ${window.cyclesRun}회 · 확인 ${window.productsSeen}개 · ` +
    `후보 ${window.candidatesFound}개 · 신규 ${window.draftsCreated}건 · ` +
    `목표 ${goal.skusNow}/${goal.skusNeeded}`;
  return { message, withinLimit: message.length <= SMS_SINGLE_SEGMENT_LIMIT };
}

/**
 * 30분 보고 문자를 보낸다. 검수 대기 알림과 마찬가지로, 발송 실패가
 * 자동 운전 사이클 자체를 막지 않는다.
 */
export async function sendPeriodicReport(
  phone: string,
  window: Pick<ReportWindow, "cyclesRun" | "productsSeen" | "candidatesFound" | "draftsCreated">,
  goal: { skusNow: number; skusNeeded: number },
): Promise<{ sent: boolean; reason: string }> {
  const report = buildPeriodicReport(window, goal);

  if (!report.withinLimit) {
    console.error(
      `[jarvis/notify] 30분 보고 문자가 ${report.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT}자)를 넘어 보내지 않았습니다`,
    );
    return { sent: false, reason: "MESSAGE_TOO_LONG" };
  }

  try {
    const result = await sendSms(phone, report.message, "jarvis-periodic-report");
    if (!result.ok) return { sent: false, reason: result.error };
    return { sent: true, reason: "OK" };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "SEND_FAILED" };
  }
}
