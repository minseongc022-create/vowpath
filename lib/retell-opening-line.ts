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
      return (
        "Great — thanks for calling {{shop_name}}! " +
        "Would you like a quick text link, or handle it on this call?"
      );
    case "estimate_choice":
      return (
        "Awesome — I'd love to help with your free estimate at {{shop_name}}! " +
        "Would you like a quick text link, or tell us about the project on this call?"
      );
    case "phone_booking":
      return "I'm right here with you — let's get this handled. What's your name?";
    case "phone_estimate":
      return "Happy to help with your estimate! What's your name?";
    default:
      return (
        "Hi — thanks for calling {{shop_name}}! " +
        "Are you calling to book service or report an emergency, or for a free estimate?"
      );
  }
}

export function isEstimateRetellPath(ivrPath?: string): boolean {
  return ivrPath === "estimate_choice" || ivrPath === "phone_estimate";
}
