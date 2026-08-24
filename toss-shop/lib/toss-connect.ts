import { getAccessToken } from "./api/client";
import type { TossApiConfig } from "./api/config";

export { TOSS_SELLER_CENTER_URL } from "./toss-connect-constants";

export function tossConnectConfig(
  accessKey: string,
  secretKey: string,
  sandbox?: boolean,
): TossApiConfig {
  return {
    accessKey: accessKey.trim(),
    secretKey: secretKey.trim(),
    sandbox: sandbox ?? false,
    partnerName: "effiroad",
  };
}

/** Validate seller API keys by requesting an access token. */
export async function validateTossSellerKeys(
  accessKey: string,
  secretKey: string,
  sandbox?: boolean,
): Promise<void> {
  const config = tossConnectConfig(accessKey, secretKey, sandbox);
  await getAccessToken("__validate__", config);
}
