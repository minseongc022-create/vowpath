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
    `안녕하세요.\n\n` +
    `${shop}에서 아래 내용으로 요청을 접수했습니다.\n\n` +
    `서비스 주소:\n${address}\n\n` +
    `요청 내용:\n${issue}\n\n` +
    `내용이 맞으면 YES를 회신해주세요.\n` +
    `수정이 필요하면 NO를 회신해주세요.`
  );
}

export function customerVerificationReminderBody(shopName?: string): string {
  const shop = resolveShopDisplayName(shopName);
  return (
    `${shop}\n\n` +
    `요청 내용 확인이 아직 완료되지 않았습니다.\n` +
    `내용 확인 후 YES 또는 NO로 회신해주세요.`
  );
}

export function customerVerificationCorrectionSmsBody(params: {
  shopName?: string;
  correctionUrl: string;
}): string {
  const shop = resolveShopDisplayName(params.shopName);
  return (
    `죄송합니다.\n\n` +
    `정확한 접수를 위해 아래 링크에서 내용을 수정해주세요.\n\n` +
    `${params.correctionUrl}\n\n` +
    `— ${shop}`
  );
}
