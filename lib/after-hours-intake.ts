/** After-hours call intake copy (US English voice + SMS). */

export function afterHoursVoiceIntro(shopName: string): string {
  return (
    `Thank you for calling ${shopName}. ` +
    `We're outside our regular office hours right now. ` +
    `We'll take your service request on this call. ` +
    `Our team will review it and contact you during the next business day. ` +
    `This is not a confirmed appointment.`
  );
}

export function afterHoursPhoneGoodbye(): string {
  return (
    "Your request has been received. " +
    "Our team will review it and contact you during the next business day. " +
    "This is not a confirmed appointment. Goodbye."
  );
}

import { resolveShopDisplayName } from "./shop-display-name";

export function afterHoursCustomerSmsBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop}: We received your service request after hours. ` +
    `Our team will review and contact you during the next business day. ` +
    `This is not a confirmed appointment. Reply STOP to opt out.`
  );
}
