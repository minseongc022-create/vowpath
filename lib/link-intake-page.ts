import {
  getLinkIntakeSession,
  LinkIntakeSessionLookupError,
  type LinkIntakeSession,
} from "@/lib/call-intake/link-intake-store";
import { normalizeLinkIntakeToken } from "@/lib/link-intake-token";

export { LinkIntakeSessionLookupError };

export async function loadLinkIntakeSession(
  rawToken: string,
): Promise<{ token: string; session: LinkIntakeSession | null }> {
  const token = normalizeLinkIntakeToken(rawToken);
  if (!token) return { token: rawToken.trim(), session: null };
  try {
    const session = await getLinkIntakeSession(token);
    return { token, session };
  } catch (e) {
    if (e instanceof LinkIntakeSessionLookupError) throw e;
    throw e;
  }
}
