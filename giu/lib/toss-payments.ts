import type { GiuPaymentMethod } from "./types";

const TOSS_API = "https://api.tosspayments.com/v1";

export function isTossConfigured(): boolean {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  const client = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim();
  return Boolean(
    secret &&
      client &&
      !secret.includes("xxxx") &&
      !client.includes("xxxx"),
  );
}

export function tossClientKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim();
  return key && !key.includes("xxxx") ? key : undefined;
}

function authHeader(): string {
  const secret = process.env.TOSS_PAYMENTS_SECRET_KEY?.trim();
  if (!secret) throw new Error("TOSS_PAYMENTS_SECRET_KEY is not set");
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

export type TossPayment = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  method?: string;
  easyPay?: { provider?: string } | null;
  status?: string;
};

export function mapTossPaymentMethod(payment: TossPayment): GiuPaymentMethod {
  const provider = payment.easyPay?.provider?.toUpperCase() ?? "";
  if (provider.includes("KAKAO")) return "kakao";
  if (provider.includes("NAVER")) return "naver";
  if (provider.includes("TOSS")) return "toss";
  const method = (payment.method ?? "").toUpperCase();
  if (method.includes("KAKAO")) return "kakao";
  if (method.includes("NAVER")) return "naver";
  if (method.includes("TOSS")) return "toss";
  return "card";
}

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<{ ok: true; payment: TossPayment } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${TOSS_API}/payments/confirm`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    });

    const data = (await res.json()) as TossPayment & { message?: string; code?: string };

    if (!res.ok) {
      const msg = data.message ?? data.code ?? "토스 결제 승인 실패";
      console.error("[giu/toss] confirm failed", res.status, data);
      return { ok: false, error: msg };
    }

    if (data.totalAmount !== input.amount) {
      return { ok: false, error: "결제 금액이 일치하지 않습니다" };
    }

    return { ok: true, payment: data };
  } catch (e) {
    console.error("[giu/toss] confirm error", e);
    return { ok: false, error: "결제 승인 중 오류가 발생했습니다" };
  }
}
