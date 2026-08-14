import { isStripeConfigured } from "./stripe";
import { isVnpayConfigured } from "./vnpay";

export type GiuPaymentBackend = "demo" | "stripe" | "vnpay";

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
  return !isStripeConfigured() && !isVnpayConfigured();
}

/** Which backend handles checkout — Stripe first for Korean solo operators. */
export function resolveGiuPaymentBackend(): GiuPaymentBackend {
  if (isGiuPaymentDemo()) return "demo";

  const forced = process.env.GIU_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (forced === "stripe" && isStripeConfigured()) return "stripe";
  if (forced === "vnpay" && isVnpayConfigured()) return "vnpay";
  if (forced === "demo") return "demo";

  if (isStripeConfigured()) return "stripe";
  if (isVnpayConfigured()) return "vnpay";
  return "demo";
}

export function giuPaymentStatus(): {
  backend: GiuPaymentBackend;
  demo: boolean;
  stripe: boolean;
  vnpay: boolean;
} {
  return {
    backend: resolveGiuPaymentBackend(),
    demo: isGiuPaymentDemo(),
    stripe: isStripeConfigured(),
    vnpay: isVnpayConfigured(),
  };
}
