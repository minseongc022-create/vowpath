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
import {
  byteLength,
  LMS_KR_LIMIT,
  resolveSolapiConfig,
  sendSolapiSms,
  type SavedSolapiSettings,
} from "../notify/solapi";
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
 * ★ 국내 발송을 먼저 쓴다 (솔라피)
 *
 * 이 도메인에 원래 있던 미국 전화응대 서비스는 트윌리오로 국제발신을
 * 한다. 자비스는 한국 사업이라 그 경로가 세 가지로 계속 걸렸다:
 * 계정 Geo permissions에 한국이 없으면 아예 안 나가고, 국제발신 SMS는
 * 67자를 넘으면 쪼개져 뜻이 뒤집히고, 단가가 다섯 배쯤 된다.
 *
 * 그래서 솔라피 설정(키 + 사전등록 발신번호)이 있으면 **국내 발송을
 * 먼저 쓴다.** 없으면 예전처럼 트윌리오로 간다 — 키를 넣는 순간 알아서
 * 넘어가고, 아직 안 넣었다고 문자가 끊기지도 않는다.
 *
 * ★ 트윌리오로 갈 때만 지역 관문을 끈다
 *
 * lib/send-sms의 기본값은 수신 번호를 미국(+1)로만 제한한다. 사장님
 * 번호는 +82라 그 관문에서 전부 거부됐다("SMS can only be sent to US
 * (+1) numbers"가 크론 응답에 계속 찍혔는데, 소싱은 성공으로 뜨니
 * 아무도 고장으로 안 봤다). 그렇다고 관문을 통째로 열면 오타 하나로
 * 아무 국제번호에나 문자가 나가므로, 여기서 **한국 휴대폰과 미국
 * 번호만** 직접 확인하고 통과시킨다.
 */
async function sendOwnerSms(
  phoneRaw: string,
  message: string,
  label: string,
  settings?: SavedSolapiSettings,
): Promise<{ sent: boolean; reason: string }> {
  const phone = normalizeSmsPhone(phoneRaw);
  if (!phone || !(phone.startsWith("+82") || phone.startsWith("+1"))) {
    console.error(`[jarvis/notify] 수신 번호를 못 읽었습니다: ${phoneRaw}`);
    return { sent: false, reason: "BAD_PHONE" };
  }

  // ── 국내 발송 (솔라피) ───────────────────────────────────
  const solapi = resolveSolapiConfig(settings);
  if (solapi && phone.startsWith("+82")) {
    try {
      const result = await sendSolapiSms({ to: phone, text: message, config: solapi });
      if (result.ok) return { sent: true, reason: "OK" };
      // 실패를 조용히 트윌리오로 넘기지 않는다. 발신번호 미등록·잔액
      // 부족은 사장님이 해결할 수 있는 일인데, 트윌리오로 흘려보내면
      // 그 이유가 트윌리오 오류에 덮여 영영 안 보인다.
      return { sent: false, reason: result.error };
    } catch (e) {
      return { sent: false, reason: e instanceof Error ? e.message : "SOLAPI_FAILED" };
    }
  }

  // ── 국제 발송 (트윌리오) — 솔라피 설정 전까지 ────────────
  try {
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
  settings?: SavedSolapiSettings,
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

  return sendOwnerSms(phone, alert.message, "jarvis-review-alert", settings);
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
  settings?: SavedSolapiSettings,
): Promise<{ sent: boolean; reason: string }> {
  const alert = buildReturnAlert(openCount);
  if (!alert.withinLimit) {
    console.error(
      `[jarvis/notify] 반품 문자가 ${alert.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT}자)를 넘어 보내지 않았습니다`,
    );
    return { sent: false, reason: "MESSAGE_TOO_LONG" };
  }
  return sendOwnerSms(phone, alert.message, "jarvis-return-alert", settings);
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
 * 국내 발송일 때 쓰는 **긴 보고**.
 *
 * ★ 왜 두 벌인가
 *
 * 위의 한 줄짜리는 국제발신 67자 한도에 맞추느라 깎을 대로 깎은 것이다.
 * 숫자만 나열돼 있어서 "소싱 3회 · 확인 15개 · 후보 2개"를 봐도 잘
 * 되고 있는 건지 막혀 있는 건지 알 수 없다. 사장님이 원한 건
 * "몇 번 했는지 **성과가 뭔지**"였는데, 성과는 그 자리에 안 들어갔다.
 *
 * 국내 LMS는 한글 1,000자가 한 통이라 그 제약이 없다. 그래서 같은
 * 창의 실적을 **읽을 수 있는 말로** 담는다 — 특히 0건일 때 왜 0인지가
 * 들어가야 한다. 숫자만 오면 사장님은 매번 화면을 열어봐야 한다.
 */
export function buildLongReport(
  window: Pick<ReportWindow, "cyclesRun" | "productsSeen" | "candidatesFound" | "draftsCreated">,
  goal: { skusNow: number; skusNeeded: number; dailyTarget?: number },
  extra?: {
    /** 이번 창에서 무엇이 막았는지 — 마지막 소싱의 한 줄 요약 */
    lastSummary?: string;
    /** 지금 검수 대기 건수 */
    pendingReview?: number;
    /** 사장님 결정을 기다리는 반품 */
    openReturns?: number;
  },
): PeriodicReport {
  const lines: string[] = ["[자비스] 30분 보고", ""];

  lines.push(`· 소싱 ${window.cyclesRun}회 돌았습니다`);
  lines.push(`· 도매 상품 ${window.productsSeen}개를 봤습니다`);
  lines.push(`· 기준을 통과한 후보 ${window.candidatesFound}개`);
  lines.push(`· 새로 만든 상품 ${window.draftsCreated}건`);

  // 0건일 때 이유를 안 적으면 이 문자는 "아무 일도 없었다"만 전한다
  if (window.draftsCreated === 0 && extra?.lastSummary) {
    lines.push("", `왜 0건인가: ${extra.lastSummary}`);
  }

  lines.push("", `목표까지 ${goal.skusNow}/${goal.skusNeeded}개`);
  if (goal.dailyTarget != null) lines.push(`오늘 목표 ${goal.dailyTarget}개`);

  if (extra?.pendingReview != null && extra.pendingReview > 0) {
    lines.push("", `검수 대기 ${extra.pendingReview}건`, REVIEW_URL);
  }
  if (extra?.openReturns != null && extra.openReturns > 0) {
    lines.push("", `확인 필요한 반품 ${extra.openReturns}건`, RETURNS_URL);
  }

  const message = lines.join("\n");
  // LMS 한도(한글 1,000자)를 넘길 일은 없지만, 없으면 언젠가 넘는다
  return { message, withinLimit: byteLength(message) <= LMS_KR_LIMIT * 2 };
}

/**
 * 30분 보고 문자를 보낸다. 검수 대기 알림과 마찬가지로, 발송 실패가
 * 자동 운전 사이클 자체를 막지 않는다.
 */
export async function sendPeriodicReport(
  phone: string,
  window: Pick<ReportWindow, "cyclesRun" | "productsSeen" | "candidatesFound" | "draftsCreated">,
  goal: { skusNow: number; skusNeeded: number; dailyTarget?: number },
  extra?: { lastSummary?: string; pendingReview?: number; openReturns?: number },
  settings?: SavedSolapiSettings,
): Promise<{ sent: boolean; reason: string }> {
  // 국내 발송이면 67자 한도가 없다 — 깎은 한 줄 대신 읽을 수 있는 보고를 보낸다
  const report = resolveSolapiConfig(settings)
    ? buildLongReport(window, goal, extra)
    : buildPeriodicReport(window, goal);

  if (!report.withinLimit) {
    console.error(
      `[jarvis/notify] 30분 보고 문자가 ${report.message.length}자로 한도(${SMS_SINGLE_SEGMENT_LIMIT}자)를 넘어 보내지 않았습니다`,
    );
    return { sent: false, reason: "MESSAGE_TOO_LONG" };
  }

  return sendOwnerSms(phone, report.message, "jarvis-periodic-report", settings);
}

/**
 * 「테스트 문자 보내기」 — 설정이 진짜 되는지 지금 확인한다.
 *
 * ★ 왜 필요한가
 *
 * 이 문자는 30분 보고나 검수 알림이 있을 때만 나간다. 즉 키를 넣고
 * **잘 들어갔는지 확인하려면 30분을 기다려야** 했다. 그동안 발신번호
 * 등록이 안 됐거나 키를 잘못 넣었어도 알 수 없다. 설정을 저장한 그
 * 자리에서 한 통 보내보면 그 자리에서 답이 나온다.
 *
 * 실패하면 이유를 그대로 돌려준다 — 발신번호 미등록·잔액 부족·키 오류는
 * 사장님이 해야 할 일이 전혀 다르다.
 */
export async function sendTestMessage(
  phone: string,
  settings?: SavedSolapiSettings,
): Promise<{ sent: boolean; reason: string; via: "solapi" | "twilio" }> {
  const via = resolveSolapiConfig(settings) ? "solapi" : "twilio";
  const text =
    via === "solapi"
      ? `[자비스] 테스트 문자입니다.\n\n국내 발송으로 연결됐습니다. 이제 30분 보고에 왜 0건인지, 검수 대기가 몇 건인지까지 담아서 보내드립니다.\n\n${REVIEW_URL}`
      : `[자비스] 테스트 문자입니다`;
  const result = await sendOwnerSms(phone, text, "jarvis-test", settings);
  return { ...result, via };
}

/**
 * 비밀번호를 잊었을 때 — 새 비밀번호를 **문자로만** 전달한다.
 *
 * ★ 왜 응답이 아니라 문자인가
 *
 * 이 함수를 부르는 경로는 CRON_SECRET로 잠긴 관리용 라우트이고, 그
 * 라우트는 GitHub Actions에서 한 번 실행하고 로그를 읽어 확인한다.
 * 만약 새 비밀번호를 HTTP 응답에 실어 돌려주면, 그 값이 워크플로 로그에
 * 그대로 남는다 — 저장소가 사장님 개인 계정이라 해도, 로그는 "사장님만
 * 아는 값"이 아니게 된다. 그래서 새 비밀번호는 이 함수 밖으로 **문자열로도
 * 반환하지 않고**, 사장님이 이미 등록해 둔 휴대폰으로만 보낸다 — 그 번호를
 * 쥔 사람이 곧 사장님이라는 전제가 이 프로젝트 전체의 보안 모델이다.
 */
export async function sendPasswordResetSms(
  phone: string,
  newPassword: string,
  settings?: SavedSolapiSettings,
): Promise<{ sent: boolean; reason: string }> {
  const text = `[자비스] 새 비밀번호: ${newPassword}\n\n로그인 후 반드시 확인하세요.`;
  return sendOwnerSms(phone, text, "jarvis-password-reset", settings);
}
