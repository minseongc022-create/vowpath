/**
 * 솔라피 — 국내 문자 발송
 *
 * ★ 왜 트윌리오에서 옮기는가
 *
 * 트윌리오는 미국 번호에서 한국으로 보내는 **국제발신**이다. 그 때문에
 * 세 가지가 계속 발목을 잡았다:
 *
 *  1. 아예 안 나갔다 — 계정의 Geo permissions에 한국이 없으면 전부 거부된다.
 *     실제로 크론 응답에 "SMS can only be sent to US (+1) numbers"가 매번
 *     찍히고 있었다.
 *
 *  2. **67자 제한** — 국제발신은 UCS-2라 67자를 넘으면 여러 조각으로
 *     쪼개지는데, 국내 통신사가 그걸 재조립해주지 않는다. 그래서 이
 *     프로젝트는 "잘린 문자가 나가느니 안 보내는 게 낫다"는 규칙을 두고
 *     문구를 글자 수 세어가며 깎아왔다. 실제로 링크가 잘려 도착한 사고가
 *     있었다.
 *
 *  3. 건당 단가가 국내 발송의 다섯 배쯤 된다.
 *
 * 국내 발송은 이 셋이 전부 없어진다. 특히 LMS는 한글 1,000자가 **한 통**이라
 * 67자 규칙 자체가 필요 없어진다 — 30분 보고에 실적·목표·반품·검수 대기를
 * 다 담아도 된다.
 *
 * ★ 발신번호 사전등록 (건너뛸 수 없다)
 *
 * 전기통신사업법상 국내 문자는 발신번호를 미리 등록해야 한다. 등록 안 된
 * 번호로 보내면 솔라피가 거부한다. 이건 우리 코드로 우회할 수 있는 게
 * 아니라서, 실패하면 **그 사실을 그대로 말한다** — "발송 실패"로 뭉뚱그리면
 * 사장님이 뭘 해야 하는지 알 수 없다.
 *
 * ★ 인증 방식
 *
 * 솔라피는 API 키를 그대로 보내지 않고, `date`와 `salt`를 API secret으로
 * HMAC-SHA256 서명해서 보낸다. 매 요청 서명이 달라 가로채도 재사용할 수
 * 없다. secret 자체는 절대 나가지 않는다.
 */

import { createHmac, randomBytes } from "node:crypto";

export const SOLAPI_VERSION = "1.0";

const API_BASE = "https://api.solapi.com";

/** 국내 SMS 한 통에 들어가는 한글 글자 수 (90바이트 = 45자) */
export const SMS_KR_LIMIT = 45;

/**
 * LMS 한 통 한도 (2,000바이트 ≈ 한글 1,000자).
 *
 * 이 위로는 LMS도 쪼개지므로 여기서 자른다. 자비스가 보내는 어떤 문자도
 * 여기 근처에 가지 않지만, 상한이 없으면 언젠가 넘는다.
 */
export const LMS_KR_LIMIT = 1000;

export type SolapiConfig = {
  apiKey: string;
  apiSecret: string;
  /** 사전등록된 발신번호 */
  from: string;
};

/**
 * 설정이 갖춰졌는가.
 *
 * 셋 중 하나라도 없으면 null이다 — 발신번호 없이 키만 있어도 보낼 수
 * 없으므로 "반쯤 설정됨"이라는 상태를 만들지 않는다.
 */
export function solapiConfigFromEnv(): SolapiConfig | null {
  const apiKey = process.env.SOLAPI_API_KEY?.trim();
  const apiSecret = process.env.SOLAPI_API_SECRET?.trim();
  const from = process.env.SOLAPI_SENDER_PHONE?.trim();
  if (!apiKey || !apiSecret || !from) return null;
  return { apiKey, apiSecret, from };
}

export function isSolapiConfigured(): boolean {
  return solapiConfigFromEnv() !== null;
}

/** 국내 형식으로 — 솔라피는 하이픈 없는 01012345678을 받는다 */
export function toKrLocalNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^01[0-9]{8,9}$/.test(digits)) return digits;
  // +82 10… → 010…
  if (digits.startsWith("82")) {
    const rest = digits.slice(2);
    const local = rest.startsWith("0") ? rest : `0${rest}`;
    if (/^01[0-9]{8,9}$/.test(local)) return local;
  }
  return null;
}

/**
 * 글자 수로 SMS/LMS를 고른다.
 *
 * SMS가 더 싸므로 짧으면 SMS로 간다. 길면 **자르지 않고** LMS로 올린다 —
 * 자르는 순간 뜻이 뒤집힐 수 있고(링크가 날아간 사고가 실제로 있었다),
 * 이 프로젝트에서 그건 가장 피해야 할 실패다.
 */
export function pickMessageType(text: string): "SMS" | "LMS" {
  return byteLength(text) <= 90 ? "SMS" : "LMS";
}

/** 국내 문자는 바이트로 센다 (한글 2바이트) */
export function byteLength(text: string): number {
  let n = 0;
  for (const ch of text) n += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return n;
}

/**
 * 솔라피 인증 헤더.
 *
 * secret은 서명에만 쓰이고 전송되지 않는다.
 */
function authHeader(cfg: SolapiConfig): string {
  const date = new Date().toISOString();
  const salt = randomBytes(32).toString("hex");
  const signature = createHmac("sha256", cfg.apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${cfg.apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export type SolapiSendResult = { ok: true } | { ok: false; error: string };

/**
 * 솔라피가 돌려준 실패 사유를 사장님이 **무엇을 해야 하는지** 아는 말로 바꾼다.
 *
 * "발송 실패"로 뭉뚱그리면 발신번호를 등록하면 되는 건지, 잔액을 채우면
 * 되는 건지, 우리 코드가 틀린 건지 알 수 없다. 셋은 해야 할 일이 전혀 다르다.
 */
export function explainSolapiError(code: string, raw: string): string {
  if (/ValidationError|InvalidPhoneNumber|1010/.test(code)) {
    return "수신 번호 형식이 올바르지 않습니다.";
  }
  if (/NotEnoughBalance|InsufficientBalance|1011/.test(code)) {
    return "솔라피 잔액이 부족합니다. 충전하시면 바로 나갑니다.";
  }
  if (/UnregisteredSenderId|NotRegisteredSenderId|InvalidSenderId/.test(code)) {
    return (
      "발신번호가 솔라피에 사전등록되지 않았습니다. " +
      "전기통신사업법상 국내 문자는 발신번호 등록이 필수라 우회할 수 없습니다 — " +
      "통신서비스 이용증명원을 솔라피 콘솔에 올려 등록해 주세요."
    );
  }
  if (/Unauthorized|InvalidApiKey|Forbidden/.test(code)) {
    return "솔라피 API 키가 올바르지 않습니다. SOLAPI_API_KEY와 SOLAPI_API_SECRET을 확인해 주세요.";
  }
  return `솔라피 발송 실패: ${raw.slice(0, 200)}`;
}

/**
 * 문자 한 통을 보낸다.
 *
 * 성공을 지어내지 않는다 — 솔라피가 실제로 접수했다고 답했을 때만
 * 성공으로 본다. HTTP 200이어도 본문에 실패가 담겨 올 수 있다.
 */
export async function sendSolapiSms(params: {
  to: string;
  text: string;
  config?: SolapiConfig | null;
}): Promise<SolapiSendResult> {
  const cfg = params.config ?? solapiConfigFromEnv();
  if (!cfg) return { ok: false, error: "SOLAPI_NOT_CONFIGURED" };

  const to = toKrLocalNumber(params.to);
  if (!to) return { ok: false, error: "수신 번호가 국내 휴대폰 번호가 아닙니다." };

  const from = toKrLocalNumber(cfg.from);
  if (!from) return { ok: false, error: "발신번호(SOLAPI_SENDER_PHONE)가 국내 번호 형식이 아닙니다." };

  const text =
    byteLength(params.text) > LMS_KR_LIMIT * 2 ? params.text.slice(0, LMS_KR_LIMIT) : params.text;
  const type = pickMessageType(text);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/messages/v4/send`, {
      method: "POST",
      headers: {
        Authorization: authHeader(cfg),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { to, from, text, type } }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "솔라피에 연결하지 못했습니다. 잠시 뒤 다시 시도합니다." };
  }

  const raw = await res.text();
  let body: { errorCode?: string; statusCode?: string; statusMessage?: string } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    // 본문을 못 읽으면 성공으로 넘기지 않는다
    return { ok: false, error: `솔라피 응답을 읽지 못했습니다 (HTTP ${res.status})` };
  }

  if (!res.ok || body.errorCode) {
    return { ok: false, error: explainSolapiError(body.errorCode ?? String(res.status), raw) };
  }

  // 접수 코드가 2000번대일 때만 성공이다
  if (body.statusCode && !body.statusCode.startsWith("2")) {
    return {
      ok: false,
      error: `솔라피가 접수하지 않았습니다: ${body.statusMessage ?? body.statusCode}`,
    };
  }

  return { ok: true };
}
