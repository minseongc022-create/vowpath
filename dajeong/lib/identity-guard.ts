import "server-only";

import { auth } from "./auth";

/**
 * A caller claiming a login-derived identity ("user_<accountId>") must actually hold that
 * session — otherwise anyone who learns someone else's account id (e.g. from a companion list,
 * an invite acceptance, or a shared-plan payload — none of these ids are secret once two people
 * are connected) could type it into a request body and act as that account: read their shared
 * plans, revise them, remove their companions.
 *
 * Anonymous ids (crypto.randomUUID() minted in the browser, never persisted server-side outside
 * this app's own tables) have no session to check against — that's the pre-login trust model
 * this app has always used, and it's unchanged here. Only account-linked ids get the extra check,
 * so logged-out flows keep working exactly as before.
 */
export async function verifyClaimedIdentity(claimedId: string | null | undefined): Promise<boolean> {
  if (!claimedId || !claimedId.startsWith("user_")) return true;
  const session = await auth().catch(() => null);
  const sessionUserId = session?.user?.id ? `user_${session.user.id}` : null;
  return sessionUserId === claimedId;
}

export const IDENTITY_MISMATCH_ERROR = "본인 계정으로 로그인한 상태에서만 이 요청을 처리할 수 있어요.";
