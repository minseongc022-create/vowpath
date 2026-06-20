import { resolveShopDisplayName } from "../shop-display-name";
import { smsCustomerVerificationBody } from "../sms-templates";

export function customerVerificationSmsBody(params: {
  shopName?: string;
  address: string;
  issueType: string;
}): string {
  return smsCustomerVerificationBody({
    shopName: resolveShopDisplayName(params.shopName),
    issueType: params.issueType,
  });
}

export function customerVerificationReminderBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return `${shop}: Still need your YES or NO to confirm your request. Thanks!`;
}

export function customerVerificationCorrectionSmsBody(params: {
  shopName?: string;
  correctionUrl: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Update your request here 👉 ${params.correctionUrl}`;
}
