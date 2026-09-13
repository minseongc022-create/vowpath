import "server-only";

/**
 * 토스페이먼츠 자동결제(빌링) API.
 *
 * ★ 1회성 결제(GIU가 쓰는 것)와 다른 API다
 *
 * GIU의 `giu/lib/toss-payments.ts`는 "지금 한 번 결제"를 승인하는
 * `/v1/payments/confirm`을 쓴다. 구독은 사용자가 매번 카드 정보를 다시
 * 넣지 않고 매달 자동으로 청구돼야 하므로 다른 흐름을 탄다:
 *
 *   1. 클라이언트 SDK가 카드 등록 화면을 띄운다 → `authKey` + `customerKey`
 *      를 들고 우리 successUrl로 돌아온다
 *   2. 서버가 `authKey`를 `billingKey`로 교환한다(카드 자체는 토스에만 남고
 *      우리는 "이 키로 결제해도 된다"는 토큰만 받는다)
 *   3. 매달 서버가 그 `billingKey`로 결제를 청구한다 — 사용자가 다시
 *      아무것도 안 해도 된다
 *
 * ★ 시크릿 키는 이 파일 밖으로 나가지 않는다
 *
 * Basic 인증 헤더를 만드는 `authHeader()`는 export하지 않는다. 다른 모듈은
 * 이 파일이 내보내는 함수(issueBillingKey, chargeBilling)만 호출하고,
 * 시크릿 키 문자열 자체를 볼 일이 없다.
 */

/**
 * 실제 결제망 주소. 환경변수로 바꿀 수 있게 둔 이유는 AI 공급자
 * (`VIBESAFE_OPENAI_BASE_URL`)와 같다 — 로컬에 가짜 서버를 띄워 카드 등록
 * →첫 결제→갱신→해지까지 전체 생애주기를 실제 네트워크 호출 코드 경로
 * 그대로 검증할 수 있다. 운영에서는 아무도 이 값을 건드리지 않는다.
 */
const TOSS_API = (process.env.VIBESAFE_TOSS_API_BASE_URL ?? "https://api.tosspayments.com/v1").replace(/\/$/, "");

export function isTossBillingConfigured(): boolean {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  const client = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim();
  return Boolean(secret && client && !secret.includes("xxxx") && !client.includes("xxxx"));
}

export function tossBillingClientKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim();
  return key && !key.includes("xxxx") ? key : undefined;
}

function authHeader(): string {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  if (!secret) throw new Error("TOSS_PAYMENTS_SECRET_KEY is not set");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export class TossBillingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TossBillingError";
  }
}

type TossErrorBody = { message?: string; code?: string };

async function tossFetch<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${TOSS_API}${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new TossBillingError("결제사와 연결하지 못했습니다. 잠시 후 다시 시도해주세요.", "NETWORK");
  }

  const data = (await res.json().catch(() => ({}))) as T & TossErrorBody;
  if (!res.ok) {
    // 토스가 돌려주는 message는 이미 한국어라 그대로 사용자에게 보여줘도 된다
    // (카드 한도 초과, 유효기간 만료 같은 문구). 로그에는 code도 같이 남긴다.
    console.error("[vibesafe/billing] toss error", res.status, data.code, data.message);
    throw new TossBillingError(data.message ?? "결제 요청이 거절되었습니다.", data.code ?? "UNKNOWN");
  }
  return data;
}

export type BillingKeyResult = {
  billingKey: string;
  cardCompany: string | null;
  cardNumberMasked: string | null;
};

type RawBillingAuth = {
  billingKey: string;
  card?: { company?: string; number?: string };
};

/** authKey(카드 등록 위젯이 돌려준 일회성 값)를 billingKey로 교환한다. */
export async function issueBillingKey(params: {
  authKey: string;
  customerKey: string;
}): Promise<BillingKeyResult> {
  const data = await tossFetch<RawBillingAuth>("/billing/authorizations/issue", {
    method: "POST",
    body: JSON.stringify({ authKey: params.authKey, customerKey: params.customerKey }),
  });
  return {
    billingKey: data.billingKey,
    cardCompany: data.card?.company ?? null,
    cardNumberMasked: data.card?.number ?? null,
  };
}

export type ChargeResult = { paymentKey: string; approvedAt: string; receiptUrl: string | null };

type RawPayment = {
  paymentKey: string;
  approvedAt: string;
  receipt?: { url?: string };
};

/**
 * billingKey로 실제 결제를 청구한다. 성공하면 그 자리에서 승인까지 끝난다
 * (카드 결제는 비동기 웹훅을 기다릴 필요가 없다 — 이 응답이 곧 결과다).
 */
export async function chargeBilling(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerEmail?: string;
}): Promise<ChargeResult> {
  const data = await tossFetch<RawPayment>(`/billing/${encodeURIComponent(params.billingKey)}`, {
    method: "POST",
    body: JSON.stringify({
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerEmail: params.customerEmail,
    }),
  });
  return {
    paymentKey: data.paymentKey,
    approvedAt: data.approvedAt,
    receiptUrl: data.receipt?.url ?? null,
  };
}
