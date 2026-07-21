/** Map Lemon Squeezy / checkout failures to owner-facing copy (EN). */
export function checkoutErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "beta":
      return "Paid checkout is paused while beta mode is on. Sign up free, or contact support to enable billing.";
    case "not_configured":
      return "Checkout is not configured yet. Pick a plan and sign up — billing goes live once Lemon Squeezy approval finishes.";
    case "missing_checkout":
      return "Could not create a checkout session. Please try again.";
    case "unavailable":
      return "Checkout is temporarily unavailable. Try again in a moment or sign up to finish setup.";
    default:
      return "We could not open checkout. Try again or sign up to continue setup.";
  }
}
