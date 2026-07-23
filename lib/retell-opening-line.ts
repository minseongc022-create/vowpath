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
      // Legacy path — same as phone_booking (no link-vs-phone question).
      return (
        "I'm glad you reached us — I'm right here with you. Take your time. What's your name?"
      );
    case "estimate_choice":
      // Legacy path — same as phone_estimate.
      return (
        "I'm glad you called — happy to help with your estimate. What's your name?"
      );
    case "phone_booking":
      return (
        "I'm glad you reached us — I'm right here with you. Take your time. What's your name?"
      );
    case "phone_estimate":
      return (
        "I'm glad you called — happy to help with your estimate. What's your name?"
      );
    default:
      return (
        "Thank you for calling {{shop_name}} — I'm glad you reached us. " +
        "Are you calling to book service or report an emergency, or for a free estimate?"
      );
  }
}

export function isEstimateRetellPath(ivrPath?: string): boolean {
  return ivrPath === "estimate_choice" || ivrPath === "phone_estimate";
}
