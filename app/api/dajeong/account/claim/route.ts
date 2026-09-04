import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/dajeong/lib/auth";
import { claimAnonymousIdentity } from "@/dajeong/lib/account-migration";

const schema = z.object({ anonymousId: z.string().trim().min(1).max(80) });

/**
 * The account id comes from the server session, never from the request body — a client
 * claiming "move this anonymous data into account X" could otherwise name any account, not
 * just its own. See account-migration.ts for the actual transfer and its safety guarantee.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "요청 정보를 확인해줘." }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "로그인 상태에서만 이전할 수 있어." }, { status: 401 });
  const result = await claimAnonymousIdentity(parsed.data.anonymousId, session.user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, alreadyClaimed: result.alreadyClaimed });
}
