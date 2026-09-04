import { NextResponse } from "next/server";
import { z } from "zod";
import { removeAllSubscriptionsForPerson } from "@/dajeong/lib/notification-store";
import { IDENTITY_MISMATCH_ERROR, verifyClaimedIdentity } from "@/dajeong/lib/identity-guard";

const schema = z.object({ personId: z.string().trim().min(1).max(80) });

/**
 * Must be called BEFORE signOut() clears the session client-side — verifyClaimedIdentity needs a
 * live session to confirm this really is that account, and there's no way to prove that anymore
 * once it's gone. See DajeongAuthStatus's logout handler for the call ordering.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해줘." }, { status: 400 });
  if (!(await verifyClaimedIdentity(parsed.data.personId))) return NextResponse.json({ error: IDENTITY_MISMATCH_ERROR }, { status: 401 });
  await removeAllSubscriptionsForPerson(parsed.data.personId);
  return NextResponse.json({ ok: true });
}
