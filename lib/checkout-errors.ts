/** Map Paddle / checkout failures to owner-facing copy (EN). */
export function checkoutErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "beta":
      return "Paid checkout is paused while beta mode is on. Sign up free, or contact support to enable billing.";
    case "not_configured":
      return "Checkout is not configured yet. Pick a plan and sign up — we will enable billing shortly.";
    case "paddle_checkout_disabled":
      return "Paddle checkout is still being activated on our account. Try again in a few hours or email support@effiroad.com.";
    case "missing_client_token":
      return "Checkout overlay is not configured (missing Paddle client token). Email support@effiroad.com.";
    case "missing_transaction":
      return "Could not create a checkout session. Please try again.";
    case "unavailable":
      return "Checkout is temporarily unavailable. Try again in a moment or sign up to finish setup.";
    default:
      return "We could not open checkout. Try again or sign up to continue setup.";
  }
}

export function paddleErrorToCode(body: unknown): string {
  const detail =
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error?: { code?: string } }).error?.code === "string"
      ? (body as { error: { code: string } }).error.code
      : "";

  if (detail === "transaction_checkout_not_enabled") return "paddle_checkout_disabled";
  return "unavailable";
}
