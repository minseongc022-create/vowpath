/** First spoken line — must match Twilio menu → Retell handoff (see lib/retell-prompt.ts). */

export type RetellIvrPath =
  | "phone_booking"
  | "phone_estimate"
  | "booking_choice"
  | "estimate_choice"
  | "";

export function buildRetellOpeningLine(ivrPath: RetellIvrPath): string {
  switch (ivrPath) {
    case "booking_choice":
    case "phone_booking":
      return "Thanks for calling. I'm right here with you — what's your name?";
    case "estimate_choice":
    case "phone_estimate":
      return "Thanks for calling about an estimate. What's your name?";
    default:
      return (
        "Thanks for calling {{shop_name}}. " +
        "Are you calling for service or emergency, or for a free estimate?"
      );
  }
}

export function isEstimateRetellPath(ivrPath?: string): boolean {
  return ivrPath === "estimate_choice" || ivrPath === "phone_estimate";
}
