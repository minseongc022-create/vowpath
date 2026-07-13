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

export function checkoutErrorMessageKo(code: string | null | undefined): string {
  switch (code) {
    case "beta":
      return "베타 모드에서는 유료 결제가 꺼져 있습니다. 무료 가입하거나 support@effiroad.com 으로 문의해 주세요.";
    case "not_configured":
      return "결제 연동이 아직 완료되지 않았습니다. 플랜을 고른 뒤 회원가입으로 진행해 주세요.";
    case "paddle_checkout_disabled":
      return "Paddle 결제창이 아직 활성화되지 않았습니다. 몇 시간 후 다시 시도하거나 support@effiroad.com 으로 문의해 주세요.";
    case "missing_client_token":
      return "결제 오버레이 설정이 빠져 있습니다(Paddle client token). support@effiroad.com 으로 문의해 주세요.";
    case "missing_transaction":
      return "결제 세션을 만들지 못했습니다. 다시 시도해 주세요.";
    case "unavailable":
      return "결제를 일시적으로 시작할 수 없습니다. 잠시 후 다시 시도하거나 회원가입으로 진행해 주세요.";
    default:
      return "결제창을 열지 못했습니다. 다시 시도하거나 회원가입으로 진행해 주세요.";
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
