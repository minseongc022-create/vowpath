import { isGiuLsConfigured } from "./lemon-squeezy-giu";
import { isVnpayConfigured } from "./vnpay";

export type GiuPaymentBackend = "demo" | "lemon_squeezy" | "vnpay";

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
  return !isGiuLsConfigured() && !isVnpayConfigured();
}

/** Lemon Squeezy first — Korean solo operators without VN entity. */
export function resolveGiuPaymentBackend(): GiuPaymentBackend {
  if (isGiuPaymentDemo()) return "demo";

  const forced = process.env.GIU_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (
    (forced === "lemon_squeezy" || forced === "lemonsqueezy" || forced === "ls") &&
    isGiuLsConfigured()
  ) {
    return "lemon_squeezy";
  }
  if (forced === "vnpay" && isVnpayConfigured()) return "vnpay";
  if (forced === "demo") return "demo";

  if (isGiuLsConfigured()) return "lemon_squeezy";
  if (isVnpayConfigured()) return "vnpay";
  return "demo";
}

export function giuPaymentStatus(): {
  backend: GiuPaymentBackend;
  demo: boolean;
  lemonSqueezy: boolean;
  vnpay: boolean;
} {
  return {
    backend: resolveGiuPaymentBackend(),
    demo: isGiuPaymentDemo(),
    lemonSqueezy: isGiuLsConfigured(),
    vnpay: isVnpayConfigured(),
  };
}
