import { resolveShopDisplayName } from "../link-intake-brand";

export function customerVerificationSmsBody(params: {
  shopName?: string;
  address: string;
  issueType: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  const address = params.address.trim() || "—";
  const issue = params.issueType.trim() || "—";
  return (
    `Hi — this is ${shop}.\n\n` +
    `We received your service request:\n\n` +
    `Address:\n${address}\n\n` +
    `Issue:\n${issue}\n\n` +
    `Reply YES if this looks correct.\n` +
    `Reply NO if something needs to be updated.`
  );
}

export function customerVerificationReminderBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop}\n\n` +
    `We still need you to confirm your request details.\n` +
    `Please reply YES or NO when you have a moment.`
  );
}

export function customerVerificationCorrectionSmsBody(params: {
  shopName?: string;
  correctionUrl: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return (
    `Sorry about that.\n\n` +
    `Please update your request here:\n\n` +
    `${params.correctionUrl}\n\n` +
    `— ${shop}`
  );
}
