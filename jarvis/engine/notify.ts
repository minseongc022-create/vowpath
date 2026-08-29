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
import { normalizeSmsPhone } from "@/lib/phone";
import { jarvisUrl } from "../host";
import { JV_ROUTES } from "../routes";
import type { ReportWindow } from "../core/types";

export const NOTIFY_VERSION = "1.0";

/** 해외발신 SMS 1건 한도. 이 문자만이 아니라 이 프로젝트 전체가 지키는 값이다 */
export const SMS_SINGLE_SEGMENT_LIMIT = 67;

const REVIEW_URL = jarvisUrl(JV_ROUTES.review);
const RETURNS_URL = jarvisUrl(JV_ROUTES.returns);

/**
 * 사장님에게 문자 한 통. 자비스의 모든 문자는 여기를 지난다.
 *
 * ★ 왜 따로 두는가 — 이 도메인에 원래 있던 미국 전화응대 서비스는
 * 수신 번호를 **미국(+1)로만** 제한한다(lib/send-sms의 기본값). 자비스
 * 사장님 번호는 한국(+82)이라 그 관문에서 전부 거부됐다. 크론 응답에
 * `"SMS can only be sent to US (+1) numbers"`가 계속 찍히고 있었는데,
 * 소싱은 성공으로 뜨니 아무도 문자가 안 오는 걸 고장으로 안 봤다.
 *
 * 그렇다고 관문을 통째로 열면 오타 하나로 아무 국제번호에나 문자가
 * 나간다. 그래서 여기서 **한국 휴대폰(010…)과 미국 번호만** 직접
 * 확인하고 통과시킨다 — 자비스 설정도 이미 010 형식만 저장한다.
 */
async function sendOwnerSms(
  phoneRaw: string,
  message: string,
  label: string,
): Promise<{ sent: boolean; reason: string }> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone || !(phone.startsWith("+82") || phone.startsWith("+1"))) {
    console.error(`[jarvis/notify] 수신 번호를 못 읽었습니다: ${phoneRaw}`);
    return { sent: false, reason: "BAD_PHONE" };
  }

  try {
    // 자비스는 한국 사업이다 — 옛 서비스의 "+1만" 제한을 여기서 끈다.
    const result = await sendSms(phone, message, label, { usRecipientsOnly: false });
    if (!result.ok) return { sent: false, reason: result.error };
    return { sent: true, reason: "OK" };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "SEND_FAILED" };
  }
}

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

  return sendOwnerSms(phone, alert.message, "jarvis-review-alert");
}

/**
 * 반품이 사장님 결정을 기다릴 때 보내는 문자.
 *
 * ★ 왜 따로 보내는가 — 반품은 응답 기한이 있는 일이다. 30분 보고에 숫자
 * 하나로 섞어 보내면 "소싱 3회 · 반품 1"처럼 지나가고, 기한은 그동안
 * 흘러간다. 자비스가 알아서 처리한 반품은 문자를 보내지 않는다(그건
 * 끝난 일이다) — **결정을 기다리는 건만** 보낸다.
 */
export function buildReturnAlert(openCount: number): ReviewAlert {
  const message = `[자비스] 반품 ${openCount}건 확인 필요\n${RETURNS_URL}`;
  return { message, withinLimit: message.length <= SMS_SINGLE_SEGMENT_LIMIT };
}

export async function sendReturnAlert(
  phone: string,
  openCount: number,
): Promise<{ sent: boolean; reason: string }> {
  const alert = buildReturnAlert(openCount);
  if (!alert.withinLimit) {
    console.error(
      `[jarvis/notify] 반품 문자가 ${alert.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT}자)를 넘어 보내지 않았습니다`,
    );
    return { sent: false, reason: "MESSAGE_TOO_LONG" };
  }
  return sendOwnerSms(phone, alert.message, "jarvis-return-alert");
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

  return sendOwnerSms(phone, report.message, "jarvis-periodic-report");
}
