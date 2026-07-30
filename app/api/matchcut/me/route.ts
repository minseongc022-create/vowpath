import { NextResponse } from "next/server";
import { getCreditBalance } from "@/lib/matchcut/credits-store";
import { getMatchCutSession } from "@/lib/matchcut/session";
import { findMatchCutUserById } from "@/lib/matchcut/users-db";

export async function GET() {
  const session = await getMatchCutSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await findMatchCutUserById(session.sub);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const credits = await getCreditBalance(user.id);
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    credits,
  });
}
