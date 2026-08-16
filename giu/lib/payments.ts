import { isGiuLsConfigured } from "./lemon-squeezy-giu";
import { isTossConfigured } from "./toss-payments";
import { isVnpayConfigured } from "./vnpay";

export type GiuPaymentBackend = "demo" | "toss" | "lemon_squeezy" | "vnpay";

function demoFlag(): boolean | null {
  const flag = process.env.GIU_PAYMENT_DEMO?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return null;
}

/** Instant success when demo flag set or no live payment keys (local dev). */
export function isGiuPaymentDemo(): boolean {
  const forced = demoFlag();
  if (forced === true) return true;
  if (forced === false) return false;
  return !isTossConfigured() && !isGiuLsConfigured() && !isVnpayConfigured();
}

/** Toss first — KRW card · Kakao · Naver · Toss Pay for Korea. */
export function resolveGiuPaymentBackend(): GiuPaymentBackend {
  if (isGiuPaymentDemo()) return "demo";

  const forced = process.env.GIU_PAYMENT_PROVIDER?.trim().toLowerCase();
  if ((forced === "toss" || forced === "tosspayments") && isTossConfigured()) {
    return "toss";
  }
  if (
    (forced === "lemon_squeezy" || forced === "lemonsqueezy" || forced === "ls") &&
    isGiuLsConfigured()
  ) {
    return "lemon_squeezy";
  }
  if (forced === "vnpay" && isVnpayConfigured()) return "vnpay";
  if (forced === "demo") return "demo";

  if (isTossConfigured()) return "toss";
  if (isGiuLsConfigured()) return "lemon_squeezy";
  if (isVnpayConfigured()) return "vnpay";
  return "demo";
}

export function giuPaymentStatus(): {
  backend: GiuPaymentBackend;
  demo: boolean;
  toss: boolean;
  tossClientKey?: string;
  lemonSqueezy: boolean;
  vnpay: boolean;
} {
  const backend = resolveGiuPaymentBackend();
  return {
    backend,
    demo: isGiuPaymentDemo(),
    toss: isTossConfigured(),
    tossClientKey:
      backend === "toss" ? process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY?.trim() : undefined,
    lemonSqueezy: isGiuLsConfigured(),
    vnpay: isVnpayConfigured(),
  };
}
