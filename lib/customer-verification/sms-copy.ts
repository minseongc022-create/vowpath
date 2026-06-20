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
  return `${shop}: Still need YES or NO to confirm — thanks! 👍`;
}

export function customerVerificationCorrectionSmsBody(params: {
  shopName?: string;
  correctionUrl: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return `${shop}: Update your details here 👉 ${params.correctionUrl}`;
}
