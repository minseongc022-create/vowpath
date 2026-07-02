import { NextResponse } from "next/server";
import { isEntitled, requiresEntitlement } from "./billing";
import { getSession } from "./session";
import { findUserById } from "./users-db";

/** Gate paid APIs when Paddle is configured and not in beta. */
export async function requireEntitledSession(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!requiresEntitlement()) {
    return { ok: true, userId: session.sub };
  }

  const user = await findUserById(session.sub);
  if (!isEntitled(user)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" },
        { status: 402 },
      ),
    };
  }

  return { ok: true, userId: session.sub };
}
