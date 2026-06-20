/** After-hours call intake copy (US English voice + SMS). */

export function afterHoursVoiceIntro(shopName: string): string {
  return (
    `We're outside regular hours right now, but we're still happy to help. ` +
    `We'll take your request and our team will follow up on the next business day. ` +
    `Just so you know — this isn't a confirmed appointment yet.`
  );
}

export function afterHoursPhoneGoodbye(): string {
  return (
    "Got it — your request is in! Our team will reach out on the next business day. " +
    "Thanks for calling. Take care!"
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
