import type { IntakeChannel } from "../call-intake/types";

/** Phone intake always gets YES/NO verification SMS; link intake never does. */
export function shouldSendCustomerVerificationSms(
  intakeChannel: IntakeChannel,
): boolean {
  return intakeChannel === "phone";
}

/** @deprecated Use shouldSendCustomerVerificationSms */
export function needsCustomerVerificationSms(
  _confidence?: unknown,
  extras?: { intakeChannel?: IntakeChannel },
): boolean {
  return shouldSendCustomerVerificationSms(extras?.intakeChannel ?? "phone");
}
