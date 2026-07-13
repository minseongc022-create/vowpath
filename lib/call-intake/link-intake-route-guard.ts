import {
  getLinkIntakeSession,
  isLinkIntakePortalOpen,
  isLinkIntakeSessionExpired,
  type LinkIntakeSession,
} from "./link-intake-store";
import { guardTenantProductEntitled } from "../tenant-product-access";

export type LinkIntakeRouteGuardFail = {
  ok: false;
  status: number;
  error: string;
  code?: string;
};

export type LinkIntakeRouteGuardOk = {
  ok: true;
  session: LinkIntakeSession;
};

type RequireLinkIntakeSessionOptions = {
  /** Require portal window (post-submit access), not just first-visit form TTL. */
  requirePortalOpen?: boolean;
  requireCallId?: boolean;
};

/** Shared session + subscription guard for public intake-link API routes. */
export async function requireLinkIntakeSession(
  token: string,
  opts: RequireLinkIntakeSessionOptions = {},
): Promise<LinkIntakeRouteGuardOk | LinkIntakeRouteGuardFail> {
  const session = await getLinkIntakeSession(token);
  if (!session || isLinkIntakeSessionExpired(session)) {
    return { ok: false, status: 404, error: "Invalid or expired link" };
  }

  const entitled = await guardTenantProductEntitled(session.userId);
  if (!entitled.ok) {
    return {
      ok: false,
      status: entitled.status,
      error: entitled.error,
      code: entitled.code,
    };
  }

  if (opts.requirePortalOpen && !isLinkIntakePortalOpen(session)) {
    return { ok: false, status: 404, error: "Link expired or invalid" };
  }

  if (opts.requireCallId && !session.callId) {
    return { ok: false, status: 404, error: "Invalid or expired link" };
  }

  return { ok: true, session };
}
