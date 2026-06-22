/** After-hours call intake copy (US English voice + SMS). */

export function afterHoursVoiceIntro(shopName: string): string {
  return (
    `We're outside our regular hours right now, but please don't worry — we're still here for you. ` +
    `We'll take your request and our team will personally follow up first thing on the next business day. ` +
    `Just so you know, this isn't a confirmed appointment yet — but we've absolutely got your back, and we're glad you called.`
  );
}

export function afterHoursPhoneGoodbye(): string {
  return (
    "Perfect — your request is in! Our team will reach out on the next business day. " +
    "Thank you so much for calling — take care, and we'll talk soon!"
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
